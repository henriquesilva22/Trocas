import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  GatewayPaymentDetails,
  PAYMENT_GATEWAY_PORT,
  PaymentGatewayPort,
} from '../../domain/payment-gateway.port';
import {
  assertTransition,
  InvalidNegotiationTransitionError,
} from '../../../negotiation/domain/negotiation-state-machine';

export interface IncomingWebhook {
  rawBody: Buffer;
  headers: Record<string, string>;
}

const PICKUP_PIN_TTL_HOURS = 72;

/**
 * Serviço central da regra "sem confiança em comprovante manual":
 * o status da Negotiation SÓ avança mediante um Webhook validado do
 * gateway de pagamento, nunca por print/PDF enviado no chat.
 *
 * Fluxo:
 *  1. Valida a assinatura HMAC do webhook (rejeita se inválida).
 *  2. Busca o pagamento na API do gateway — a verdade nunca é o payload
 *     do webhook em si, apenas um gatilho para consultar a fonte real.
 *  3. Localiza a Negotiation associada e aplica a transição de estado
 *     de forma idempotente (webhooks podem chegar duplicados).
 *  4. Ao confirmar o pagamento, gera o PIN de retirada do Hub.
 */
@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY_PORT) private readonly gateway: PaymentGatewayPort,
  ) {}

  async handle(webhook: IncomingWebhook): Promise<{ received: true }> {
    if (!this.gateway.verifyWebhookSignature(webhook.rawBody, webhook.headers)) {
      this.logger.warn('Webhook de pagamento com assinatura inválida — descartado');
      throw new UnauthorizedException('Assinatura de webhook inválida');
    }

    const payload = JSON.parse(webhook.rawBody.toString('utf8'));
    const gatewayPaymentId: string | undefined = payload?.data?.id;
    if (!gatewayPaymentId) {
      throw new BadRequestException('Webhook sem id de pagamento');
    }

    // Nunca confiamos no "status" que vem no corpo do webhook — ele é só
    // um aviso de "algo mudou". Buscamos o estado real na API do gateway.
    const paymentDetails = await this.gateway.fetchPaymentDetails(gatewayPaymentId);

    if (paymentDetails.status !== 'approved') {
      this.logger.log(
        `Pagamento ${gatewayPaymentId} com status "${paymentDetails.status}" — aguardando confirmação`,
      );
      return { received: true };
    }

    await this.confirmPayment(paymentDetails);
    return { received: true };
  }

  private async confirmPayment(details: GatewayPaymentDetails): Promise<void> {
    const negotiationId = details.externalReference;

    await this.prisma.$transaction(async (tx) => {
      const negotiation = await tx.negotiation.findUnique({
        where: { id: negotiationId },
        include: { payment: true },
      });

      if (!negotiation || !negotiation.payment) {
        this.logger.warn(`Negociação ${negotiationId} ou pagamento associado não encontrado`);
        return;
      }

      // Idempotência: se já processamos esse pagamento antes (reentrega do
      // webhook), não reprocessa — apenas confirma recebimento ao gateway.
      if (negotiation.payment.status === 'CONFIRMADO') {
        this.logger.log(`Pagamento da negociação ${negotiationId} já estava confirmado`);
        return;
      }

      try {
        assertTransition(negotiation.status, 'PAGAMENTO_CONFIRMADO');
      } catch (err) {
        if (err instanceof InvalidNegotiationTransitionError) {
          this.logger.error(
            `Webhook confirmou pagamento mas negociação ${negotiationId} está em ` +
              `estado "${negotiation.status}", incompatível com PAGAMENTO_CONFIRMADO`,
          );
          return;
        }
        throw err;
      }

      await tx.payment.update({
        where: { id: negotiation.payment.id },
        data: {
          status: 'CONFIRMADO',
          paidAt: new Date(),
          lastWebhookPayload: details as unknown as Prisma.InputJsonValue,
        },
      });

      // Guarda de concorrência otimista: só aplica se o status ainda for
      // o esperado, evitando corrida com outro webhook duplicado processado
      // em paralelo. As duas transições são persistidas em separado — cada
      // uma validada pela máquina de estados — em vez de pular direto de
      // PAGAMENTO_PENDENTE para PIN_GERADO.
      const confirmedUpdate = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'PAGAMENTO_CONFIRMADO' },
      });
      if (confirmedUpdate.count === 0) {
        throw new Error(
          `Corrida detectada ao confirmar pagamento da negociação ${negotiationId} — retry pelo gateway`,
        );
      }

      assertTransition('PAGAMENTO_CONFIRMADO', 'PIN_GERADO');
      const pickupPin = this.generatePickupPin();

      const pinUpdate = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: 'PAGAMENTO_CONFIRMADO' },
        data: {
          status: 'PIN_GERADO',
          pickupPin,
          pickupPinExpiresAt: new Date(Date.now() + PICKUP_PIN_TTL_HOURS * 60 * 60 * 1000),
        },
      });
      if (pinUpdate.count === 0) {
        throw new Error(`Corrida detectada ao gerar PIN da negociação ${negotiationId}`);
      }

      this.logger.log(
        `Negociação ${negotiationId}: PAGAMENTO_PENDENTE -> PAGAMENTO_CONFIRMADO -> PIN_GERADO`,
      );

      // TODO: publicar evento de domínio (ex: NegotiationPinGeneratedEvent)
      // para o módulo de notificações avisar o comprador via push/e-mail.
    });
  }

  /** PIN de 6 dígitos apresentado no Hub para retirada — não é o QR code em si, mas o código exibido junto a ele. */
  private generatePickupPin(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
