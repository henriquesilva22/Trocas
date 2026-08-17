import { Injectable } from '@nestjs/common';
import { Prisma, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Nunca `buyer: true` — devolveria passwordHash do comprador pro vendedor
// (e vice-versa em /proposals/mine) através dessas rotas.
const SAFE_BUYER_SELECT = {
  id: true,
  name: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

const PROPOSAL_DETAIL_INCLUDE = {
  product: true,
  offeredProduct: true,
  buyer: { select: SAFE_BUYER_SELECT },
} satisfies Prisma.ProposalInclude;

@Injectable()
export class ProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProposalCreateInput) {
    return this.prisma.proposal.create({ data, include: PROPOSAL_DETAIL_INCLUDE });
  }

  createInTx(tx: Prisma.TransactionClient, data: Prisma.ProposalCreateInput) {
    return tx.proposal.create({ data, include: PROPOSAL_DETAIL_INCLUDE });
  }

  findById(id: string) {
    return this.prisma.proposal.findUniqueOrThrow({
      where: { id },
      include: PROPOSAL_DETAIL_INCLUDE,
    });
  }

  findManyForProduct(productId: string) {
    return this.prisma.proposal.findMany({
      where: { productId },
      include: PROPOSAL_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Thread de propostas/contrapropostas de UM comprador num produto — usado pelo comprador pra ver/decidir contrapropostas recebidas. */
  findManyForProductAndBuyer(productId: string, buyerId: string) {
    return this.prisma.proposal.findMany({
      where: { productId, buyerId },
      include: PROPOSAL_DETAIL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: ProposalStatus) {
    return this.prisma.proposal.update({ where: { id }, data: { status } });
  }

  updateStatusInTx(tx: Prisma.TransactionClient, id: string, status: ProposalStatus) {
    return tx.proposal.update({ where: { id }, data: { status } });
  }

  /**
   * Rejeita as propostas pendentes concorrentes de um produto (usado tanto
   * pro produto-alvo quanto pro produto oferecido, ao aceitar uma proposta —
   * evita o mesmo item ficar comprometido em duas trocas simultâneas).
   */
  rejectAllPendingExceptInTx(tx: Prisma.TransactionClient, productId: string, keepId: string) {
    return tx.proposal.updateMany({
      where: { productId, status: ProposalStatus.PENDENTE, id: { not: keepId } },
      data: { status: ProposalStatus.REJEITADA },
    });
  }
}
