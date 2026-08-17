// ============================================================================
// STUB — NÃO CONECTADO A NENHUM MODULE. Item 20 do documento de escopo:
// "Taxa de intermediação -> Gateway -> R$15 usuário A + R$15 usuário B ->
// Plataforma recebe". O dinheiro do PRODUTO em si (PaymentService) continua
// fora do gateway — só a taxa de intermediação passaria pelo Mercado Pago.
//
// Ainda não temos MERCADO_PAGO_ACCESS_TOKEN válido (a chave já existe no
// .env, mas não é lida em lugar nenhum hoje) — por instrução explícita, o
// corpo real fica comentado até termos o token, pra não arriscar quebrar o
// fluxo manual de PlatformFeeService que já está funcionando e testado.
//
// Quando o token existir:
//   1. `npm install mercadopago`
//   2. Descomentar o corpo abaixo
//   3. Registrar este service num MercadoPagoModule próprio e trocar o botão
//      "Enviei o PIX — anexar comprovante" da tela de taxa por um redirect
//      pra `createPreference(...)` — sem remover o fluxo manual, os dois
//      podem coexistir atrás de uma flag até a migração ser validada.
// ============================================================================

// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { MercadoPagoConfig, Preference } from 'mercadopago';
//
// export interface PlatformFeePreference {
//   checkoutUrl: string;
//   preferenceId: string;
// }
//
// @Injectable()
// export class MercadoPagoService {
//   private readonly logger = new Logger(MercadoPagoService.name);
//   private readonly client: MercadoPagoConfig;
//
//   constructor(private readonly config: ConfigService) {
//     this.client = new MercadoPagoConfig({
//       accessToken: this.config.getOrThrow<string>('MERCADO_PAGO_ACCESS_TOKEN'),
//     });
//   }
//
//   /** Cria uma preferência de pagamento pra UM lado da taxa (R$15). */
//   async createPreference(params: {
//     negotiationId: string;
//     payerRole: 'BUYER' | 'SELLER';
//     payerId: string;
//     amount: number;
//   }): Promise<PlatformFeePreference> {
//     const preference = new Preference(this.client);
//     const result = await preference.create({
//       body: {
//         items: [
//           {
//             id: `platform-fee-${params.negotiationId}-${params.payerRole}`,
//             title: 'Taxa de intermediação Trocas',
//             quantity: 1,
//             unit_price: params.amount,
//           },
//         ],
//         external_reference: `${params.negotiationId}:${params.payerRole}`,
//         notification_url: `${this.config.getOrThrow('API_BASE_URL')}/webhooks/mercado-pago`,
//       },
//     });
//     return { checkoutUrl: result.init_point!, preferenceId: result.id! };
//   }
//
//   /**
//    * Webhook do Mercado Pago — validar `MERCADO_PAGO_WEBHOOK_SECRET` (já no
//    * .env) contra a assinatura do header antes de confiar no payload, e só
//    * então chamar PlatformFeeService.confirmCharge equivalente pro
//    * `external_reference` recebido.
//    */
//   async handleWebhook(payload: unknown): Promise<void> {
//     this.logger.log('Webhook do Mercado Pago recebido — implementar validação de assinatura');
//   }
// }
