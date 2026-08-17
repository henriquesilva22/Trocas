import { Injectable } from '@nestjs/common';
import { AdminActionType, ProductCategory } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const DISPUTE_ACTIONS: AdminActionType[] = [
  AdminActionType.RESOLVE_DISPUTE_APPROVE,
  AdminActionType.RESOLVE_DISPUTE_CANCEL,
];

export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  trustScore: number;
  avgRating: number | null;
  reviewCount: number;
  finalizedTrades: number;
  inProgressTrades: number;
  cancelledTrades: number;
  disputesCount: number;
  completionRate: number | null;
  tradesByCategory: Partial<Record<ProductCategory, number>>;
}

/**
 * Agrega tudo que o item 18 pede — sem tabela de histórico nova: "disputas"
 * reaproveita a trilha de auditoria (AdminAuditLog) que resolveDispute já
 * grava; "trocas por categoria" soma em código (JS) em vez de groupBy do
 * Prisma porque a categoria vive no Product relacionado, não na Negotiation
 * — Prisma não agrupa por campo de relação diretamente, e o volume de trocas
 * de um usuário é pequeno o bastante pra não precisar de SQL bruto aqui.
 */
@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true, trustScore: true },
    });

    const [reviewAgg, negotiations, inProgressCount, disputeTargetIds] = await Promise.all([
      this.prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.negotiation.findMany({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
          status: { in: ['FINALIZADO', 'CANCELADO'] },
        },
        select: {
          status: true,
          buyerId: true,
          product: { select: { category: true } },
          offeredProduct: { select: { category: true } },
        },
      }),
      this.prisma.negotiation.count({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
          status: { notIn: ['FINALIZADO', 'CANCELADO'] },
        },
      }),
      this.prisma.adminAuditLog.findMany({
        where: { action: { in: DISPUTE_ACTIONS } },
        select: { targetId: true },
        distinct: ['targetId'],
      }),
    ]);

    const finalized = negotiations.filter((n) => n.status === 'FINALIZADO');
    const cancelled = negotiations.filter((n) => n.status === 'CANCELADO');

    const tradesByCategory: Partial<Record<ProductCategory, number>> = {};
    for (const n of finalized) {
      const receivedCategory = n.buyerId === userId ? n.product.category : n.offeredProduct?.category;
      if (receivedCategory) {
        tradesByCategory[receivedCategory] = (tradesByCategory[receivedCategory] ?? 0) + 1;
      }
    }

    const disputesCount =
      disputeTargetIds.length === 0
        ? 0
        : await this.prisma.negotiation.count({
            where: {
              id: { in: disputeTargetIds.map((d) => d.targetId) },
              OR: [{ buyerId: userId }, { sellerId: userId }],
            },
          });

    const completionDenominator = finalized.length + cancelled.length;

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      trustScore: user.trustScore,
      avgRating: reviewAgg._avg.rating,
      reviewCount: reviewAgg._count,
      finalizedTrades: finalized.length,
      inProgressTrades: inProgressCount,
      cancelledTrades: cancelled.length,
      disputesCount,
      completionRate: completionDenominator === 0 ? null : finalized.length / completionDenominator,
      tradesByCategory,
    };
  }
}
