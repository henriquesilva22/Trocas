import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminActionType, PlatformFeePayerRole, Prisma, ShippingCharge } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';

// Admin vê a listagem, mas não precisa (e não deve) ver passwordHash do pagador.
const SAFE_PAYER_SELECT = { id: true, name: true, email: true } satisfies Prisma.UserSelect;

export interface ShippingView {
  companyPixKey: string;
  companyReceiverName: string;
  charge: ShippingCharge;
}

/**
 * Frete de UM lado da troca (o que escolheu ENVIO em vez de retirar no Hub)
 * — mesmo desenho manual (PIX pra empresa, comprovante, confirmação) do
 * PlatformFeeService, valor fixo via config (sem cálculo real de
 * transportadora). Código de rastreio é digitado manualmente por quem
 * despacha no Hub — sem integração de transportadora real.
 */
@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly flatFee: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) {
    this.flatFee = Number(this.config.get('SHIPPING_FLAT_FEE', '24.90'));
  }

  get flatFeeAmount(): number {
    return this.flatFee;
  }

  /** Chamado quando o usuário escolhe ENVIO como forma de receber (idempotente). */
  createCharge(negotiationId: string, payerRole: PlatformFeePayerRole, payerId: string) {
    return this.prisma.shippingCharge.upsert({
      where: { negotiationId_payerRole: { negotiationId, payerRole } },
      update: {},
      create: { negotiationId, payerRole, payerId, amount: this.flatFee },
    });
  }

  async getForUser(negotiationId: string, userId: string): Promise<ShippingView> {
    const companyPixKey = this.config.get<string>('COMPANY_PIX_KEY');
    const companyReceiverName = this.config.get<string>('COMPANY_PIX_RECEIVER_NAME');
    if (!companyPixKey || !companyReceiverName) {
      throw new InternalServerErrorException(
        'Chave PIX da empresa não configurada (COMPANY_PIX_KEY / COMPANY_PIX_RECEIVER_NAME)',
      );
    }

    const charge = await this.prisma.shippingCharge.findFirst({
      where: { negotiationId, payerId: userId },
    });
    if (!charge) {
      throw new NotFoundException('Nenhuma cobrança de frete encontrada pra este usuário/negociação');
    }

    return { companyPixKey, companyReceiverName, charge };
  }

  async submitReceipt(negotiationId: string, userId: string, receiptUrl: string): Promise<void> {
    const charge = await this.prisma.shippingCharge.findFirst({
      where: { negotiationId, payerId: userId },
    });
    if (!charge) {
      throw new ForbiddenException('Você não tem cobrança de frete nesta negociação');
    }
    if (charge.status !== 'PENDENTE') {
      throw new ConflictException(`Cobrança ${charge.id} já está em status ${charge.status}`);
    }

    const updated = await this.prisma.shippingCharge.updateMany({
      where: { id: charge.id, status: 'PENDENTE' },
      data: { receiptUrl, receiptSubmittedAt: new Date(), status: 'COMPROVANTE_ENVIADO' },
    });
    if (updated.count === 0) {
      throw new ConflictException(`Corrida detectada ao registrar comprovante do frete ${charge.id}`);
    }

    this.logger.log(`Frete ${charge.id}: PENDENTE -> COMPROVANTE_ENVIADO`);
  }

  /** Técnico/admin digita o código depois de despachar o item pro destinatário. */
  setTrackingCode(chargeId: string, trackingCode: string) {
    return this.prisma.shippingCharge.update({ where: { id: chargeId }, data: { trackingCode } });
  }

  async confirmCharge(chargeId: string, adminId: string): Promise<void> {
    const charge = await this.prisma.shippingCharge.findUniqueOrThrow({ where: { id: chargeId } });
    if (charge.status === 'CONFIRMADO') {
      this.logger.log(`Frete ${chargeId} já estava confirmado`);
      return;
    }

    const updated = await this.prisma.shippingCharge.updateMany({
      where: { id: chargeId, status: charge.status },
      data: { status: 'CONFIRMADO', confirmedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new ConflictException(`Corrida detectada ao confirmar frete ${chargeId}`);
    }

    await this.auditLog.record({
      adminId,
      action: AdminActionType.CONFIRM_SHIPPING,
      targetId: charge.negotiationId,
      reason: `Confirmado frete de ${charge.payerRole} (cobrança ${chargeId})`,
    });

    this.logger.log(`Frete ${chargeId} confirmado pelo admin ${adminId}`);
  }

  async list(params: { status?: string; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where = status ? { status: status as never } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shippingCharge.findMany({
        where,
        include: { payer: { select: SAFE_PAYER_SELECT }, negotiation: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shippingCharge.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
