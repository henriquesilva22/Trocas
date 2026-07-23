# Troca Segura — MVP (Baixa Mogiana)

Marketplace de eletrônicos entre pessoas físicas com intermediação física
("Inspection-as-a-Service"), sem custódia financeira. 100% sobre camadas
gratuitas.

## Stack

| Camada | Tecnologia | Free tier |
|---|---|---|
| Frontend | Next.js + TS + Tailwind (PWA) | Vercel |
| Backend | NestJS + TS (DDD) | Render / Koyeb |
| Banco | PostgreSQL + Prisma | Supabase |
| Storage | Supabase Storage | 1 GB / 2 GB banda |
| Realtime | Supabase Realtime / Socket.io | Supabase |
| Mapas | Leaflet.js + OpenStreetMap | — |
| Pagamento | Mercado Pago / Asaas (Split) | taxa % apenas |

## Árvore de diretórios do backend (DDD)

Cada módulo de domínio segue `domain / application / infrastructure / interface`:
- **domain**: entidades, regras e invariantes puras (ex: máquina de estados) — sem dependência de framework.
- **application**: serviços/use-cases que orquestram o domínio + DTOs.
- **infrastructure**: implementações concretas (Prisma repositories, adapters de gateway).
- **interface**: controllers HTTP/webhooks expostos ao mundo externo.

```
backend/src/
├── main.ts
├── app.module.ts
├── config/
├── shared/
│   ├── prisma/            # PrismaService/PrismaModule (@Global)
│   ├── guards/
│   ├── decorators/
│   └── filters/
└── modules/
    ├── users/              # cadastro, autenticação, perfil
    ├── reputation/         # Review + recálculo de Trust Score (0-100)
    ├── catalog/            # Product, categorias, fotos (Supabase Storage)
    ├── negotiation/        # Proposal + Negotiation (MÁQUINA DE ESTADOS)
    │   ├── domain/negotiation-state-machine.ts   ← fonte única de transições válidas
    │   └── infrastructure/negotiation.repository.ts
    ├── inspection/         # checklist do técnico, laudo, lacre, prateleira
    │   ├── domain/inspection-checklist.types.ts  ← itens obrigatórios do checklist
    │   ├── application/services/inspection.service.ts  ← dropoff/start/approve/reject
    │   └── interface/inspection.controller.ts
    ├── payments/           # webhooks de gateway, Split, sem custódia
    │   ├── domain/payment-gateway.port.ts        ← abstração MP/Asaas
    │   ├── infrastructure/gateways/mercado-pago.gateway.ts
    │   ├── application/services/payment-webhook.service.ts  ← confirma pagamento (webhook)
    │   ├── application/services/payment-charge.service.ts   ← gera cobrança (aprovação)
    │   └── interface/payment-webhook.controller.ts
    ├── chat/               # mensagens por negociação (Supabase Realtime)
    ├── hubs/               # centros de inspeção físicos (lat/lng p/ Leaflet)
    │   ├── interface/hubs.controller.ts          ← GET público + CRUD ADMIN
    │   └── application/services/hubs.service.ts
    └── admin/              # painel do administrador (disputas, banimento, auditoria)
        ├── application/services/admin-negotiations.service.ts
        ├── application/services/admin-users.service.ts
        └── interface/admin.controller.ts
```

`negotiation`, `payments`, `inspection`, `hubs`, `admin` e a raiz de
`shared` (inclusive `shared/audit`) estão implementados; `users`, `catalog`,
`chat` e `reputation` já existem no disco como esqueleto pronto para os
próximos módulos, mantendo a mesma convenção.

## Modelagem de dados

Ver [`prisma/schema.prisma`](prisma/schema.prisma). Destaques:

- `NegotiationStatus` é o enum que espelha exatamente o fluxo pedido:
  `AGUARDANDO_DROPOFF → EM_CUSTODIA_FISICA → EM_INSPECAO →
  INSPECIONADO_E_APROVADO → PAGAMENTO_PENDENTE → PAGAMENTO_CONFIRMADO →
  PIN_GERADO → FINALIZADO` (mais os ramais `CANCELADO`/`EM_DISPUTA`/
  `INSPECIONADO_REPROVADO`).
- `Inspection` guarda `technicianId`, `hubId`, `shelfLocation` (prateleira) e
  `sealCode` (lacre) — rastreio completo da custódia física.
- `Payment` nunca guarda saldo — só o `gatewayPaymentId`, o `splitDetails`
  (para quem foi o repasse) e o payload bruto do último webhook, para
  auditoria.
- `Proposal` é imutável: uma vez `ACEITA`, vira 1:1 com `Negotiation`; os
  termos (`amount`) não têm update.

## Máquina de estados + Webhook de pagamento

`backend/src/modules/negotiation/domain/negotiation-state-machine.ts` define
`ALLOWED_TRANSITIONS` como mapa fechado — qualquer serviço que tente pular
etapas (ex: confirmar pagamento antes da inspeção aprovar) recebe
`InvalidNegotiationTransitionError`.

`payment-webhook.service.ts` (o serviço pedido no item 3) faz:

1. Valida a assinatura HMAC do webhook (`x-signature` do Mercado Pago) —
   descarta qualquer payload não assinado corretamente.
2. **Nunca confia no corpo do webhook como verdade** — usa o `id` recebido
   só para consultar a API do gateway e buscar o status real do pagamento.
3. Dentro de uma transação Prisma, aplica a transição
   `PAGAMENTO_PENDENTE → PAGAMENTO_CONFIRMADO → PIN_GERADO` de forma
   **idempotente** (webhooks duplicados não reprocessam) e com guarda de
   concorrência otimista (`updateMany` filtrando pelo status atual).
4. Gera o PIN de 6 dígitos de retirada (`pickupPin`) com validade de 72h,
   que o comprador apresenta no Hub físico.

`inspection.service.ts` fecha o outro lado do fluxo — o técnico:

1. `registerDropoff`: `AGUARDANDO_DROPOFF → EM_CUSTODIA_FISICA`.
2. `startInspection`: cria o registro de `Inspection` e move para
   `EM_INSPECAO`.
3. `approve`: exige checklist completo e 100% aprovado
   (`inspection-checklist.types.ts`), grava laudo/lacre/prateleira, move
   para `INSPECIONADO_E_APROVADO` e, na sequência, chama
   `PaymentChargeService.createChargeForNegotiation` — que valida a
   transição, cria a cobrança PIX com Split no gateway (fora de transação
   de banco, para não segurar lock esperando a rede) e só então persiste o
   `Payment` e move para `PAGAMENTO_PENDENTE`.
4. `reject`: move para `INSPECIONADO_REPROVADO`.

Endpoints do técnico exigem `@Roles('TECHNICIAN')` via `RolesGuard`
(`backend/src/shared/guards/roles.guard.ts`) — guard ainda depende de um
`JwtAuthGuard` do futuro `UsersModule` para popular `req.user`.

## Verificação de erros (revisão feita nesta rodada)

Sem Node instalado nesta máquina para rodar `tsc`/`nest build`, a checagem
foi manual, campo a campo contra `schema.prisma`. Bugs reais encontrados e
corrigidos:

1. **Cast inválido em campo `Json`** (`payment-webhook.service.ts`,
   `inspection.service.ts`): passar um objeto tipado (não um literal) direto
   para um campo `Json` do Prisma não compila — TS exige índice de string
   explícito. Corrigido com `as unknown as Prisma.InputJsonValue`.
2. **Transição de estado pulada** (`payment-webhook.service.ts`): o código
   validava `PAGAMENTO_PENDENTE → PAGAMENTO_CONFIRMADO` mas gravava
   `PIN_GERADO` direto no banco, sem nunca persistir o estado intermediário
   — um hop não validado pela máquina de estados. Agora são duas
   transições guardadas em sequência, cada uma checada e persistida.
3. **`timingSafeEqual` sem guarda de tamanho** (`mercado-pago.gateway.ts`):
   um header `x-signature` malformado (tamanho diferente do hash esperado)
   fazia `crypto.timingSafeEqual` lançar `RangeError` sem tratamento — a
   requisição virava 500 em vez de 401. Também protegido o `JSON.parse` do
   corpo contra payload malformado.
4. **Repositórios órfãos**: `InspectionRepository` foi criado mas nunca
   injetado em lugar nenhum — removido. `NegotiationRepository` só era
   usado internamente; passou a ser consumido de verdade pelo `AdminModule`
   (dashboard/disputas), com métodos novos de listagem paginada e detalhe.
5. **`hubId` do dropoff sem validação**: chegava via `@Body('hubId')` cru,
   sem DTO. Criado `RegisterDropoffDto` com `@IsString()`.

## Painel do administrador

`AdminModule` (`/admin/*`, restrito a `@Roles('ADMIN')`):

- `GET /admin/negotiations?status=EM_DISPUTA` — dashboard paginado.
- `GET /admin/negotiations/:id` — detalhe completo (produto, comprador,
  vendedor, hub, inspeção, pagamento, reviews).
- `POST /admin/negotiations/:id/resolve-dispute` — só atua sobre
  `EM_DISPUTA`, que a máquina de estados só deixa ir para `CANCELADO` ou de
  volta a `INSPECIONADO_E_APROVADO` (o admin não consegue pular direto para
  `FINALIZADO` sem passar pelo pagamento de novo).
- `GET /admin/users`, `PATCH /admin/users/:id/ban` /
  `PATCH /admin/users/:id/unban` — moderação, nunca expõe `passwordHash`.

Toda ação de escrita grava uma linha em `AdminAuditLog` (quem, quando, ação,
alvo, motivo) via `AuditLogService`
(`backend/src/shared/audit/audit-log.service.ts`) — o mesmo serviço
compartilhado usado pelo `HubsModule` para logar criação/edição/desativação
de Hub, evitando que o `AdminModule` precise importar cada módulo de
domínio só para auditar por eles.

`HubsModule` completa o scaffold que estava vazio: `GET /hubs` e
`GET /hubs/:id` são públicos (alimentam o mapa Leaflet do frontend);
`POST /hubs`, `PATCH /hubs/:id` e `POST /hubs/:id/deactivate` exigem
`@Roles('ADMIN')`.

## Rodando localmente

```bash
cd backend
npm install
cp .env.example .env   # preencher DATABASE_URL (Supabase), credenciais do MP
npx prisma migrate dev --name init
npm run start:dev
```

O endpoint de webhook fica em `POST /payments/webhooks/mercado-pago` — em
dev, exponha com `ngrok`/`cloudflared` para o Mercado Pago conseguir
notificar sua máquina local.

## Próximos passos sugeridos

1. `UsersModule` (auth JWT + hash de senha, incluindo o
   `JwtAuthGuard` que falta para o `RolesGuard` funcionar de ponta a ponta
   em `inspection`, `hubs` e `admin`) e `CatalogModule` (CRUD de produtos +
   upload para Supabase Storage).
2. `NegotiationService`: criar a `Negotiation` a partir de uma `Proposal`
   `ACEITA` (etapa "Acordo" do fluxo, hoje só coberta pelo repository).
3. Endpoint de pickup: valida `pickupPin`, transiciona
   `PIN_GERADO → FINALIZADO` e trava a tela para as duas avaliações
   obrigatórias.
4. `ChatModule` sobre Supabase Realtime (ou Socket.io) por `negotiationId`.
5. `ReputationModule`: recalcula `trustScore` (0–100) das duas partes ao
   registrar as reviews de `FINALIZADO`.
6. Frontend PWA em Next.js consumindo a API, o mapa Leaflet com os `Hub`s e
   um painel simples para o `AdminModule`.
7. Rodar `npm install` + `npx tsc --noEmit` de verdade assim que houver
   Node disponível — a revisão desta rodada foi manual (sem Node instalado
   nesta máquina) e, embora cuidadosa, não substitui o compilador.
