import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminActionType, Prisma, PlatformFeeCharge, PlatformFeeStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';
import { assertTransition } from '../../../negotiation/domain/negotiation-state-machine';

// Admin vê a listagem, mas não precisa (e não deve) ver passwordHash do pagador.
const SAFE_PAYER_SELECT = { id: true, name: true, email: true } satisfies Prisma.UserSelect;

export interface PlatformFeeInfo {
  companyPixKey: string;
  companyReceiverName: string;
  charges: PlatformFeeCharge[];
}

/**
 * Taxa fixa da plataforma, paga por comprador E vendedor separadamente,
 * direto pra chave PIX da própria empresa — sem gateway. Cada lado anexa
 * comprovante e um ADMIN confirma manualmente (é dinheiro entrando na
 * empresa, não entre pares, então não faz sentido o outro usuário confirmar).
 * Só libera o dropoff no Hub depois que as DUAS cobranças confirmarem.
 */
@Injectable()
export class PlatformFeeService {
  private readonly logger = new Logger(PlatformFeeService.name);
  private readonly feeAmount: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {
    this.feeAmount = Number(this.config.get('PLATFORM_FEE_AMOUNT', '15'));
  }

  /** Cria as duas cobranças (BUYER/SELLER) na primeira vez que alguém acessa. */
  async getOrCreateCharges(negotiationId: string): Promise<PlatformFeeCharge[]> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });

    await this.prisma.platformFeeCharge.createMany({
      data: [
        { negotiationId, payerRole: 'BUYER', payerId: negotiation.buyerId, amount: this.feeAmount },
        { negotiationId, payerRole: 'SELLER', payerId: negotiation.sellerId, amount: this.feeAmount },
      ],
      skipDuplicates: true,
    });

    return this.prisma.platformFeeCharge.findMany({ where: { negotiationId } });
  }

  async getForNegotiation(negotiationId: string): Promise<PlatformFeeInfo> {
    const companyPixKey = this.config.get<string>('COMPANY_PIX_KEY');
    const companyReceiverName = this.config.get<string>('COMPANY_PIX_RECEIVER_NAME');
    if (!companyPixKey || !companyReceiverName) {
      throw new InternalServerErrorException(
        'Chave PIX da empresa não configurada (COMPANY_PIX_KEY / COMPANY_PIX_RECEIVER_NAME)',
      );
    }

    const charges = await this.getOrCreateCharges(negotiationId);
    return { companyPixKey, companyReceiverName, charges };
  }

  /** Quem paga (comprador ou vendedor) anexa o próprio comprovante. */
  async submitReceipt(negotiationId: string, userId: string, receiptUrl: string): Promise<void> {
    const charge = await this.prisma.platformFeeCharge.findFirst({
      where: { negotiationId, payerId: userId },
    });
    if (!charge) {
      throw new ForbiddenException('Você não é comprador nem vendedor desta negociação');
    }
    if (charge.status !== 'PENDENTE') {
      throw new ConflictException(`Cobrança ${charge.id} já está em status ${charge.status}`);
    }

    const updated = await this.prisma.platformFeeCharge.updateMany({
      where: { id: charge.id, status: 'PENDENTE' },
      data: { receiptUrl, receiptSubmittedAt: new Date(), status: 'COMPROVANTE_ENVIADO' },
    });
    if (updated.count === 0) {
      throw new ConflictException(`Corrida detectada ao registrar comprovante da cobrança ${charge.id}`);
    }

    this.logger.log(`Cobrança de taxa ${charge.id} (${charge.payerRole}): PENDENTE -> COMPROVANTE_ENVIADO`);
  }

  /** Admin confirma que a empresa recebeu o PIX de uma das partes. */
  async confirmCharge(chargeId: string, adminId: string): Promise<void> {
    const charge = await this.prisma.platformFeeCharge.findUniqueOrThrow({ where: { id: chargeId } });
    if (charge.status === 'CONFIRMADO') {
      this.logger.log(`Cobrança de taxa ${chargeId} já estava confirmada`);
      return;
    }

    const updated = await this.prisma.platformFeeCharge.updateMany({
      where: { id: chargeId, status: charge.status },
      data: { status: 'CONFIRMADO', confirmedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new ConflictException(`Corrida detectada ao confirmar cobrança ${chargeId}`);
    }

    await this.auditLog.record({
      adminId,
      action: AdminActionType.CONFIRM_PLATFORM_FEE,
      targetId: charge.negotiationId,
      reason: `Confirmada taxa de ${charge.payerRole} (cobrança ${chargeId})`,
    });

    const siblingCharge = await this.prisma.platformFeeCharge.findFirst({
      where: { negotiationId: charge.negotiationId, payerRole: { not: charge.payerRole } },
    });

    if (siblingCharge?.status !== 'CONFIRMADO') {
      this.logger.log(`Cobrança de taxa ${chargeId} confirmada — aguardando a outra parte`);
      return;
    }

    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: charge.negotiationId },
    });
    assertTransition(negotiation.status, 'AGUARDANDO_DROPOFF');

    const negotiationUpdate = await this.prisma.negotiation.updateMany({
      where: { id: charge.negotiationId, status: negotiation.status },
      data: { status: 'AGUARDANDO_DROPOFF' },
    });
    if (negotiationUpdate.count === 0) {
      throw new ConflictException(
        `Corrida detectada ao liberar negociação ${charge.negotiationId} para dropoff`,
      );
    }

    this.logger.log(`Negociação ${charge.negotiationId}: AGUARDANDO_PAGAMENTO_TAXA -> AGUARDANDO_DROPOFF`);
  }

  /** Listagem paginada pro admin achar o que precisa confirmar. */
  async list(params: { status?: PlatformFeeStatus; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: Prisma.PlatformFeeChargeWhereInput = status ? { status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.platformFeeCharge.findMany({
        where,
        include: { payer: { select: SAFE_PAYER_SELECT }, negotiation: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.platformFeeCharge.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
