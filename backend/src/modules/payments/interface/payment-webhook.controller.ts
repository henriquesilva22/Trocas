import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentWebhookService } from '../application/services/payment-webhook.service';

/**
 * Endpoint público chamado pelo Mercado Pago. Precisa do corpo cru (raw
 * body) para validar a assinatura HMAC — configurado em main.ts com
 * `rawBody: true` e lido aqui via `req.rawBody` (ver bootstrap).
 */
@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(private readonly webhookService: PaymentWebhookService) {}

  @Post('mercado-pago')
  @HttpCode(200)
  async handleMercadoPago(
    @Req() req: Request & { rawBody: Buffer },
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhookService.handle({ rawBody: req.rawBody, headers });
  }
}
