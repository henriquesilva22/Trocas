import { Injectable } from '@nestjs/common';
import { AdminActionType } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const DISPUTE_ACTIONS: AdminActionType[] = [
  AdminActionType.RESOLVE_DISPUTE_APPROVE,
  AdminActionType.RESOLVE_DISPUTE_CANCEL,
];

export interface AdminDashboardStats {
  usersCount: number;
  productsCount: number;
  negotiationsInProgress: number;
  negotiationsFinalized: number;
  platformRevenue: number;
  inspectionsCount: number;
  disputesCount: number;
}

/** Painel "Hoje" do dashboard de admin (item 21) — só leitura, sem estado próprio. */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminDashboardStats> {
    const [
      usersCount,
      productsCount,
      negotiationsInProgress,
      negotiationsFinalized,
      revenueAgg,
      inspectionsCount,
      disputeTargetIds,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { status: { not: 'REMOVIDO' } } }),
      this.prisma.negotiation.count({ where: { status: { notIn: ['FINALIZADO', 'CANCELADO'] } } }),
      this.prisma.negotiation.count({ where: { status: 'FINALIZADO' } }),
      this.prisma.platformFeeCharge.aggregate({ where: { status: 'CONFIRMADO' }, _sum: { amount: true } }),
      this.prisma.inspection.count(),
      this.prisma.adminAuditLog.findMany({
        where: { action: { in: DISPUTE_ACTIONS } },
        select: { targetId: true },
        distinct: ['targetId'],
      }),
    ]);

    return {
      usersCount,
      productsCount,
      negotiationsInProgress,
      negotiationsFinalized,
      platformRevenue: Number(revenueAgg._sum.amount ?? 0),
      inspectionsCount,
      disputesCount: disputeTargetIds.length,
    };
  }
}
