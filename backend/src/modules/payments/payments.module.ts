import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentWebhookController } from './interface/payment-webhook.controller';
import { PaymentWebhookService } from './application/services/payment-webhook.service';
import { PaymentChargeService } from './application/services/payment-charge.service';
import { MercadoPagoGateway } from './infrastructure/gateways/mercado-pago.gateway';
import { PAYMENT_GATEWAY_PORT } from './domain/payment-gateway.port';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentWebhookController],
  providers: [
    PaymentWebhookService,
    PaymentChargeService,
    // Troca de gateway (ex: para Asaas) fica isolada nesta linha —
    // o resto do módulo depende apenas da porta PAYMENT_GATEWAY_PORT.
    { provide: PAYMENT_GATEWAY_PORT, useClass: MercadoPagoGateway },
  ],
  // PaymentChargeService é consumido pelo InspectionModule ao aprovar um item.
  exports: [PaymentWebhookService, PaymentChargeService],
})
export class PaymentsModule {}
