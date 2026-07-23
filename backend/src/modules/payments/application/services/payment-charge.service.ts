import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  PAYMENT_GATEWAY_PORT,
  PaymentGatewayPort,
} from '../../domain/payment-gateway.port';
import { assertTransition } from '../../../negotiation/domain/negotiation-state-machine';

export interface CreatedCharge {
  pixQrCode: string;
  pixCopyPaste: string;
}

/**
 * Responsável por UM lado do fluxo de pagamento: gerar a cobrança quando
 * a inspeção aprova o produto (INSPECIONADO_E_APROVADO -> PAGAMENTO_PENDENTE).
 * O outro lado — confirmar quando o gateway avisa que foi pago — é o
 * PaymentWebhookService. Os dois nunca se chamam diretamente; conversam
 * através do status da Negotiation.
 */
@Injectable()
export class PaymentChargeService {
  private readonly logger = new Logger(PaymentChargeService.name);
  private readonly platformFeePercentage: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_GATEWAY_PORT) private readonly gateway: PaymentGatewayPort,
  ) {
    this.platformFeePercentage = Number(this.config.get('PLATFORM_FEE_PERCENTAGE', '0.08'));
  }

  async createChargeForNegotiation(negotiationId: string): Promise<CreatedCharge> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
      include: { payment: true, seller: true },
    });

    if (negotiation.payment) {
      throw new ConflictException(
        `Negociação ${negotiationId} já possui uma cobrança (${negotiation.payment.gatewayPaymentId})`,
      );
    }

    // Valida a transição ANTES de chamar o gateway — evita criar uma
    // cobrança "órfã" para uma negociação em estado incompatível.
    assertTransition(negotiation.status, 'PAGAMENTO_PENDENTE');

    if (!negotiation.seller.paymentGatewayAccountId) {
      throw new ConflictException(
        `Vendedor ${negotiation.sellerId} não possui conta de recebimento configurada no gateway`,
      );
    }

    const amount = Number(negotiation.amount);
    const platformFee = Math.round(amount * this.platformFeePercentage * 100) / 100;

    // Chamada de rede ao gateway feita FORA de transação de banco — uma
    // transação Prisma não deve ficar aberta esperando uma resposta HTTP
    // externa (risco de segurar locks/conexões do pool por muito tempo).
    const charge = await this.gateway.createSplitCharge({
      negotiationId,
      amount,
      platformFee,
      sellerReceiverId: negotiation.seller.paymentGatewayAccountId,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          negotiationId,
          gateway: this.gateway.gatewayName,
          gatewayPaymentId: charge.gatewayPaymentId,
          amount,
          platformFee,
          splitDetails: {
            sellerReceiverId: negotiation.seller.paymentGatewayAccountId,
            platformFeePercentage: this.platformFeePercentage,
          },
          status: 'PENDENTE',
        },
      });

      const updated = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'PAGAMENTO_PENDENTE' },
      });

      if (updated.count === 0) {
        // Corrida: status mudou entre a leitura e aqui. A cobrança já foi
        // criada no gateway com X-Idempotency-Key = negotiationId, então
        // uma nova tentativa não duplica — mas o registro local ficaria
        // inconsistente, então melhor falhar alto e investigar.
        throw new ConflictException(
          `Corrida detectada ao mover negociação ${negotiationId} para PAGAMENTO_PENDENTE`,
        );
      }
    });

    this.logger.log(`Negociação ${negotiationId}: INSPECIONADO_E_APROVADO -> PAGAMENTO_PENDENTE`);

    return { pixQrCode: charge.pixQrCode, pixCopyPaste: charge.pixCopyPaste };
  }
}
