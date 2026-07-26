import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { assertTransition } from '../../../negotiation/domain/negotiation-state-machine';

const PICKUP_PIN_TTL_HOURS = 72;

export interface PaymentView {
  amount: number;
  sellerPixKey: string;
  sellerName: string;
  status: string;
  receiptUrl: string | null;
  buyerId: string;
  sellerId: string;
}

/**
 * Pagamento manual, direto do comprador pro vendedor via PIX — sem gateway,
 * sem custódia. O sistema só mostra a chave PIX e registra o que os dois
 * lados informam; a palavra final de "recebi ou não recebi" é do vendedor.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chamado pelo InspectionService ao aprovar o item: calcula o valor,
   * congela a chave PIX do vendedor no momento (snapshot) e libera a tela
   * de pagamento pro comprador.
   */
  async initiatePayment(negotiationId: string): Promise<PaymentView> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
      include: { payment: true, seller: true },
    });

    if (negotiation.payment) {
      throw new ConflictException(`Negociação ${negotiationId} já possui um pagamento registrado`);
    }

    assertTransition(negotiation.status, 'PAGAMENTO_PENDENTE');

    if (!negotiation.seller.pixKey) {
      throw new ConflictException(
        `Vendedor ${negotiation.sellerId} não cadastrou uma chave PIX de recebimento`,
      );
    }

    const amount = Number(negotiation.amount);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          negotiationId,
          amount,
          sellerPixKey: negotiation.seller.pixKey!,
          status: 'PENDENTE',
        },
      });

      const updated = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'PAGAMENTO_PENDENTE' },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          `Corrida detectada ao mover negociação ${negotiationId} para PAGAMENTO_PENDENTE`,
        );
      }
    });

    this.logger.log(`Negociação ${negotiationId}: INSPECIONADO_E_APROVADO -> PAGAMENTO_PENDENTE`);

    return {
      amount,
      sellerPixKey: negotiation.seller.pixKey,
      sellerName: negotiation.seller.name,
      status: 'PENDENTE',
      receiptUrl: null,
      buyerId: negotiation.buyerId,
      sellerId: negotiation.sellerId,
    };
  }

  /** Retorna o que o comprador precisa ver pra pagar (ou já pagou). */
  async getForNegotiation(negotiationId: string): Promise<PaymentView> {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { negotiationId },
      include: { negotiation: { include: { seller: true } } },
    });

    return {
      amount: Number(payment.amount),
      sellerPixKey: payment.sellerPixKey,
      sellerName: payment.negotiation.seller.name,
      status: payment.status,
      receiptUrl: payment.receiptUrl,
      buyerId: payment.negotiation.buyerId,
      sellerId: payment.negotiation.sellerId,
    };
  }

  /** Comprador anexa o comprovante do PIX que fez direto pro vendedor. */
  async submitReceipt(negotiationId: string, buyerId: string, receiptUrl: string): Promise<void> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    if (negotiation.buyerId !== buyerId) {
      throw new ForbiddenException('Apenas o comprador desta negociação pode enviar o comprovante');
    }

    assertTransition(negotiation.status, 'COMPROVANTE_ENVIADO');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { negotiationId },
        data: {
          receiptUrl,
          receiptSubmittedAt: new Date(),
          status: 'COMPROVANTE_ENVIADO',
        },
      });

      const updated = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'COMPROVANTE_ENVIADO' },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          `Corrida detectada ao registrar comprovante da negociação ${negotiationId}`,
        );
      }
    });

    this.logger.log(`Negociação ${negotiationId}: PAGAMENTO_PENDENTE -> COMPROVANTE_ENVIADO`);
  }

  /** Vendedor confirma (ou nega) que recebeu o PIX do comprador. */
  async confirmReceipt(negotiationId: string, sellerId: string, received: boolean): Promise<void> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    if (negotiation.sellerId !== sellerId) {
      throw new ForbiddenException('Apenas o vendedor desta negociação pode confirmar o recebimento');
    }

    if (!received) {
      assertTransition(negotiation.status, 'EM_ANALISE');

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { negotiationId }, data: { status: 'CONTESTADO' } });

        const updated = await tx.negotiation.updateMany({
          where: { id: negotiationId, status: negotiation.status },
          data: { status: 'EM_ANALISE' },
        });
        if (updated.count === 0) {
          throw new ConflictException(`Corrida detectada ao contestar pagamento da negociação ${negotiationId}`);
        }
      });

      this.logger.log(`Negociação ${negotiationId}: COMPROVANTE_ENVIADO -> EM_ANALISE (vendedor não recebeu)`);
      return;
    }

    assertTransition(negotiation.status, 'PAGAMENTO_CONFIRMADO');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { negotiationId },
        data: { status: 'CONFIRMADO', confirmedAt: new Date() },
      });

      const confirmedUpdate = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'PAGAMENTO_CONFIRMADO' },
      });
      if (confirmedUpdate.count === 0) {
        throw new ConflictException(`Corrida detectada ao confirmar pagamento da negociação ${negotiationId}`);
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
        throw new ConflictException(`Corrida detectada ao gerar PIN da negociação ${negotiationId}`);
      }
    });

    this.logger.log(
      `Negociação ${negotiationId}: COMPROVANTE_ENVIADO -> PAGAMENTO_CONFIRMADO -> PIN_GERADO`,
    );
  }

  /** PIN de 6 dígitos apresentado no Hub para retirada. */
  private generatePickupPin(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
