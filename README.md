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
| Pagamento | PIX manual (sem gateway) — comprovante + confirmação | — |

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
    ├── payments/           # PIX direto comprador -> vendedor, sem gateway
    │   ├── application/services/payment.service.ts  ← initiate/receipt/confirm
    │   └── interface/payment.controller.ts
    ├── platform-fee/       # taxa fixa (comprador + vendedor) para a chave PIX da empresa
    │   ├── application/services/platform-fee.service.ts
    │   └── interface/platform-fee.controller.ts
    ├── chat/               # mensagens por negociação (Supabase Realtime)
    ├── hubs/               # centros de inspeção físicos (lat/lng p/ Leaflet)
    │   ├── interface/hubs.controller.ts          ← GET público + CRUD ADMIN
    │   └── application/services/hubs.service.ts
    └── admin/              # painel do administrador (disputas, banimento, auditoria)
        ├── application/services/admin-negotiations.service.ts
        ├── application/services/admin-users.service.ts
        └── interface/admin.controller.ts
```

`negotiation`, `payments`, `platform-fee`, `inspection`, `hubs`, `admin` e a
raiz de `shared` (inclusive `shared/audit`) estão implementados; `users`,
`catalog`, `chat` e `reputation` já existem no disco como esqueleto pronto
para os próximos módulos, mantendo a mesma convenção.

## Modelagem de dados

Ver [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). Destaques:

- `NegotiationStatus` é o enum que espelha exatamente o fluxo pedido:
  `AGUARDANDO_PAGAMENTO_TAXA → AGUARDANDO_DROPOFF → EM_CUSTODIA_FISICA →
  EM_INSPECAO → INSPECIONADO_E_APROVADO → PAGAMENTO_PENDENTE →
  COMPROVANTE_ENVIADO → PAGAMENTO_CONFIRMADO → PIN_GERADO → FINALIZADO`
  (mais os ramais `CANCELADO`/`EM_ANALISE`/`INSPECIONADO_REPROVADO`).
- `Inspection` guarda `technicianId`, `hubId`, `shelfLocation` (prateleira) e
  `sealCode` (lacre) — rastreio completo da custódia física.
- `Payment` é o pagamento do produto: PIX direto comprador → vendedor, sem
  gateway. Guarda um snapshot da `sellerPixKey` no momento da cobrança, o
  `receiptUrl` do comprovante anexado pelo comprador, e o `status`
  (`PENDENTE → COMPROVANTE_ENVIADO → CONFIRMADO`, ou `CONTESTADO` se o
  vendedor disser que não recebeu).
- `PlatformFeeCharge` é a taxa fixa da plataforma (`PLATFORM_FEE_AMOUNT`),
  cobrada em duas linhas por negociação (`payerRole` `BUYER`/`SELLER`),
  pagas direto pra chave PIX da empresa e confirmadas manualmente por um
  admin — só libera `AGUARDANDO_DROPOFF` quando as duas confirmarem.
- `Proposal` é imutável: uma vez `ACEITA`, vira 1:1 com `Negotiation`; os
  termos (`amount`) não têm update.

## Máquina de estados + Pagamento manual por PIX

`backend/src/modules/negotiation/domain/negotiation-state-machine.ts` define
`ALLOWED_TRANSITIONS` como mapa fechado — qualquer serviço que tente pular
etapas (ex: confirmar pagamento antes da inspeção aprovar) recebe
`InvalidNegotiationTransitionError`.

Não existe gateway de pagamento — os dois pagamentos do fluxo (taxa da
plataforma e o valor do produto) são PIX manual: quem paga anexa um
comprovante (`receiptUrl`), e quem recebe confirma manualmente.

**Taxa da plataforma** (`platform-fee.service.ts`), no início da negociação:

1. `getOrCreateCharges`: cria uma cobrança de `PLATFORM_FEE_AMOUNT` pro
   comprador e outra pro vendedor (`PlatformFeeCharge`, `payerRole`
   `BUYER`/`SELLER`), ambas pra chave PIX da empresa (`COMPANY_PIX_KEY`).
2. Cada um anexa o próprio comprovante (`submitReceipt`) — resolvido pelo
   `payerId` de quem chama, nunca por um campo de role vindo do client.
3. Um **admin** confirma cada cobrança manualmente (`confirmCharge`,
   `POST /admin/platform-fees/:chargeId/confirm`) — é dinheiro entrando na
   empresa, não faz sentido a outra parte confirmar.
4. Só quando as duas cobranças estiverem `CONFIRMADO` a negociação sai de
   `AGUARDANDO_PAGAMENTO_TAXA` para `AGUARDANDO_DROPOFF`.

**Pagamento do produto** (`payment.service.ts`), depois da inspeção aprovar:

1. `initiatePayment`: calcula o `amount`, congela um snapshot da
   `sellerPixKey` do vendedor e move `INSPECIONADO_E_APROVADO →
   PAGAMENTO_PENDENTE`.
2. O comprador paga direto pro vendedor e chama `submitReceipt` —
   `PAGAMENTO_PENDENTE → COMPROVANTE_ENVIADO`.
3. O **vendedor** confirma (`confirmReceipt`): se recebeu, aplica
   `COMPROVANTE_ENVIADO → PAGAMENTO_CONFIRMADO → PIN_GERADO` de forma
   guardada (duas transições persistidas em sequência, `updateMany`
   filtrando pelo status atual) e gera o PIN de 6 dígitos (`pickupPin`,
   validade 72h) que o comprador apresenta no Hub; se não recebeu, vai pra
   `EM_ANALISE`, que o `AdminModule` já resolve (`resolve-dispute`).

`inspection.service.ts` fecha o outro lado do fluxo — o técnico:

1. `registerDropoff`: `AGUARDANDO_DROPOFF → EM_CUSTODIA_FISICA` (só possível
   depois que a taxa da plataforma libera esse status).
2. `startInspection`: cria o registro de `Inspection` e move para
   `EM_INSPECAO`.
3. `approve`: exige checklist completo e 100% aprovado
   (`inspection-checklist.types.ts`), grava laudo/lacre/prateleira, move
   para `INSPECIONADO_E_APROVADO` e, na sequência, chama
   `PaymentService.initiatePayment`.
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

- `GET /admin/negotiations?status=EM_ANALISE` — dashboard paginado.
- `GET /admin/negotiations/:id` — detalhe completo (produto, comprador,
  vendedor, hub, inspeção, pagamento, reviews).
- `POST /admin/negotiations/:id/resolve-dispute` — só atua sobre
  `EM_ANALISE`, que a máquina de estados só deixa ir para `CANCELADO` ou de
  volta a `INSPECIONADO_E_APROVADO` (o admin não consegue pular direto para
  `FINALIZADO` sem passar pelo pagamento de novo).
- `GET /admin/users`, `PATCH /admin/users/:id/ban` /
  `PATCH /admin/users/:id/unban` — moderação, nunca expõe `passwordHash`.
- `GET /admin/platform-fees?status=COMPROVANTE_ENVIADO` — cobranças de taxa
  pendentes de confirmação.
- `POST /admin/platform-fees/:chargeId/confirm` — confirma que a empresa
  recebeu o PIX da taxa; quando as duas partes (comprador e vendedor) da
  mesma negociação estiverem confirmadas, libera `AGUARDANDO_DROPOFF`.

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
cp .env.example .env   # preencher DATABASE_URL (Supabase), COMPANY_PIX_KEY
npx prisma migrate dev --name init
npm run start:dev
```

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL apontando pro backend
npm run dev                  # http://localhost:3001 (3000 é o backend)
```

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
6. `frontend/` (Next.js + TS + Tailwind, App Router) tem o scaffold básico
   criado — falta consumir a API, o mapa Leaflet com os `Hub`s e um painel
   simples para o `AdminModule`.
7. Rodar `npm install` + `npx tsc --noEmit` de verdade assim que houver
   Node disponível — a revisão desta rodada foi manual (sem Node instalado
   nesta máquina) e, embora cuidadosa, não substitui o compilador.
