import { Injectable } from '@nestjs/common';
import { NegotiationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const ADMIN_DETAIL_INCLUDE = {
  product: true,
  buyer: true,
  seller: true,
  hub: true,
  inspection: true,
  payment: true,
  platformFeeCharges: true,
  reviews: true,
} satisfies Prisma.NegotiationInclude;

@Injectable()
export class NegotiationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.negotiation.findUniqueOrThrow({ where: { id } });
  }

  /** Listagem paginada para o painel do administrador, com filtro opcional por status. */
  async findManyForAdmin(params: { status?: NegotiationStatus; page: number; pageSize: number }) {
    const { status, page, pageSize } = params;
    const where: Prisma.NegotiationWhereInput = status ? { status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.negotiation.findMany({
        where,
        include: ADMIN_DETAIL_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.negotiation.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  findDetailedById(id: string) {
    return this.prisma.negotiation.findUniqueOrThrow({
      where: { id },
      include: ADMIN_DETAIL_INCLUDE,
    });
  }

  /**
   * Atualiza status da negociação dentro de uma transação, usando
   * `updateMany` com filtro no status atual como guarda de concorrência
   * otimista — evita corrida entre dois webhooks duplicados processando
   * a mesma transição simultaneamente.
   */
  async updateStatusGuarded(
    tx: Prisma.TransactionClient,
    id: string,
    fromStatus: NegotiationStatus,
    data: Prisma.NegotiationUpdateInput,
  ): Promise<boolean> {
    const result = await tx.negotiation.updateMany({
      where: { id, status: fromStatus },
      data,
    });
    return result.count === 1;
  }

  withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
