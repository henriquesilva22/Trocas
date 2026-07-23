import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  GatewayPaymentDetails,
  PaymentGatewayPort,
} from '../../domain/payment-gateway.port';

/**
 * Adapter do Mercado Pago. Implementa a porta genérica de gateway —
 * o resto do domínio de Payments nunca importa nada do SDK do MP
 * diretamente.
 *
 * Docs relevantes: Split de pagamentos via "application fee" +
 * webhooks assinados com x-signature (HMAC-SHA256).
 */
@Injectable()
export class MercadoPagoGateway implements PaymentGatewayPort {
  readonly gatewayName = 'MERCADO_PAGO' as const;

  private readonly webhookSecret: string;
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.webhookSecret = this.config.getOrThrow<string>('MERCADO_PAGO_WEBHOOK_SECRET');
    this.accessToken = this.config.getOrThrow<string>('MERCADO_PAGO_ACCESS_TOKEN');
  }

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): boolean {
    // Formato do header x-signature: "ts=<timestamp>,v1=<hash>"
    const signatureHeader = headers['x-signature'];
    const requestId = headers['x-request-id'];
    if (!signatureHeader || !requestId) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.trim().split('=') as [string, string]),
    );
    const { ts, v1: receivedHash } = parts;
    if (!ts || !receivedHash) return false;

    // Manifest exigido pelo Mercado Pago para validar a assinatura.
    // dataId vem no corpo do webhook (JSON) — extraído pelo caller.
    let dataId: unknown;
    try {
      dataId = JSON.parse(rawBody.toString('utf8'))?.data?.id;
    } catch {
      // Corpo malformado não pode nem ser considerado — assinatura inválida.
      return false;
    }
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

    const expectedHash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedHash);
    const receivedBuffer = Buffer.from(receivedHash);
    // timingSafeEqual lança RangeError se os buffers tiverem tamanhos
    // diferentes — um header adulterado não pode virar 500, tem que ser
    // tratado como "assinatura inválida" (false).
    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  async fetchPaymentDetails(gatewayPaymentId: string): Promise<GatewayPaymentDetails> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${gatewayPaymentId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar pagamento ${gatewayPaymentId} no Mercado Pago`);
    }

    const data = await response.json();

    const statusMap: Record<string, GatewayPaymentDetails['status']> = {
      approved: 'approved',
      pending: 'pending',
      in_process: 'pending',
      rejected: 'rejected',
      refunded: 'refunded',
      cancelled: 'rejected',
    };

    return {
      gatewayPaymentId: String(data.id),
      status: statusMap[data.status] ?? 'pending',
      amount: data.transaction_amount,
      externalReference: data.external_reference,
    };
  }

  async createSplitCharge(params: {
    negotiationId: string;
    amount: number;
    platformFee: number;
    sellerReceiverId: string;
  }): Promise<{ gatewayPaymentId: string; pixQrCode: string; pixCopyPaste: string }> {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': params.negotiationId,
      },
      body: JSON.stringify({
        transaction_amount: params.amount,
        payment_method_id: 'pix',
        external_reference: params.negotiationId,
        // Split: repasse ao vendedor descontando a taxa da plataforma na origem.
        // O comprador nunca envia dinheiro para uma conta da Troca Segura.
        application_fee: params.platformFee,
        collector_id: params.sellerReceiverId,
        notification_url: `${process.env.API_BASE_URL}/payments/webhooks/mercado-pago`,
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao criar cobrança PIX com Split no Mercado Pago');
    }

    const data = await response.json();

    return {
      gatewayPaymentId: String(data.id),
      pixQrCode: data.point_of_interaction.transaction_data.qr_code_base64,
      pixCopyPaste: data.point_of_interaction.transaction_data.qr_code,
    };
  }
}
