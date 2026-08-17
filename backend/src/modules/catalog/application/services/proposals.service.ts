import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ProductStatus, ProposalStatus, ProposedBy } from '@prisma/client';
import { ProductRepository } from '../../infrastructure/product.repository';
import { ProposalRepository } from '../../infrastructure/proposal.repository';
import { NegotiationRepository } from '../../../negotiation/infrastructure/negotiation.repository';
import { CreateProposalDto } from '../dto/create-proposal.dto';
import { CounterProposalDto } from '../dto/counter-proposal.dto';
import { omitPasswordHash } from '../../../../shared/security/sanitize-user';

const PROPOSAL_TTL_DAYS = 7;

function proposalExpiry(): Date {
  return new Date(Date.now() + PROPOSAL_TTL_DAYS * 24 * 60 * 60 * 1000);
}

@Injectable()
export class ProposalsService {
  constructor(
    private readonly proposalRepository: ProposalRepository,
    private readonly productRepository: ProductRepository,
    private readonly negotiationRepository: NegotiationRepository,
  ) {}

  async create(productId: string, buyerId: string, dto: CreateProposalDto) {
    const product = await this.productRepository.findById(productId);
    if (product.status !== ProductStatus.DISPONIVEL) {
      throw new ConflictException('Este produto não está mais disponível');
    }
    if (product.sellerId === buyerId) {
      throw new ForbiddenException('Você não pode propor troca pelo seu próprio produto');
    }

    if (dto.offeredProductId) {
      const offered = await this.productRepository.findById(dto.offeredProductId);
      if (offered.sellerId !== buyerId) {
        throw new ForbiddenException('O produto oferecido precisa ser seu');
      }
      if (offered.status !== ProductStatus.DISPONIVEL) {
        throw new ConflictException('O produto que você quer oferecer não está disponível');
      }
    }

    return this.proposalRepository.create({
      product: { connect: { id: productId } },
      buyer: { connect: { id: buyerId } },
      offeredProduct: dto.offeredProductId ? { connect: { id: dto.offeredProductId } } : undefined,
      amount: dto.amount,
      message: dto.message,
      proposedBy: ProposedBy.BUYER,
      expiresAt: proposalExpiry(),
    });
  }

  async listForProduct(productId: string, sellerId: string) {
    const product = await this.productRepository.findById(productId);
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Apenas o dono do anúncio pode ver as propostas recebidas');
    }
    return this.proposalRepository.findManyForProduct(productId);
  }

  /** Thread de propostas do próprio comprador nesse produto — inclui contrapropostas recebidas do vendedor. */
  listMineForProduct(productId: string, buyerId: string) {
    return this.proposalRepository.findManyForProductAndBuyer(productId, buyerId);
  }

  /**
   * Dono do produto responde com uma contraproposta: mesmos dois produtos,
   * novo valor. A proposta original é rejeitada e uma nova linha é criada
   * apontando pra ela via `respondsTo` — a decisão (aceitar/recusar) volta
   * pro comprador original.
   */
  async counter(proposalId: string, sellerId: string, dto: CounterProposalDto) {
    const proposal = await this.proposalRepository.findById(proposalId);
    if (proposal.product.sellerId !== sellerId) {
      throw new ForbiddenException('Apenas o dono do produto pode fazer contraproposta');
    }
    if (proposal.status !== ProposalStatus.PENDENTE) {
      throw new ConflictException(`Proposta ${proposalId} já está em status ${proposal.status}`);
    }

    return this.negotiationRepository.withTransaction(async (tx) => {
      await this.proposalRepository.updateStatusInTx(tx, proposal.id, ProposalStatus.REJEITADA);

      return this.proposalRepository.createInTx(tx, {
        product: { connect: { id: proposal.productId } },
        buyer: { connect: { id: proposal.buyerId } },
        offeredProduct: proposal.offeredProductId
          ? { connect: { id: proposal.offeredProductId } }
          : undefined,
        amount: dto.amount,
        message: dto.message,
        proposedBy: ProposedBy.SELLER,
        respondsTo: { connect: { id: proposal.id } },
        expiresAt: proposalExpiry(),
      });
    });
  }

  async accept(proposalId: string, userId: string) {
    const proposal = await this.proposalRepository.findById(proposalId);
    this.assertCanDecide(proposal, userId);
    if (proposal.status !== ProposalStatus.PENDENTE) {
      throw new ConflictException(`Proposta ${proposalId} já está em status ${proposal.status}`);
    }

    return this.negotiationRepository.withTransaction(async (tx) => {
      await this.proposalRepository.updateStatusInTx(tx, proposal.id, ProposalStatus.ACEITA);
      await this.proposalRepository.rejectAllPendingExceptInTx(tx, proposal.productId, proposal.id);
      await this.productRepository.updateStatusInTx(tx, proposal.productId, ProductStatus.EM_NEGOCIACAO);

      if (proposal.offeredProductId) {
        await this.proposalRepository.rejectAllPendingExceptInTx(
          tx,
          proposal.offeredProductId,
          proposal.id,
        );
        await this.productRepository.updateStatusInTx(
          tx,
          proposal.offeredProductId,
          ProductStatus.EM_NEGOCIACAO,
        );
      }

      const negotiation = await this.negotiationRepository.create(tx, {
        proposal: { connect: { id: proposal.id } },
        product: { connect: { id: proposal.productId } },
        offeredProduct: proposal.offeredProductId
          ? { connect: { id: proposal.offeredProductId } }
          : undefined,
        buyer: { connect: { id: proposal.buyerId } },
        seller: { connect: { id: proposal.product.sellerId } },
        amount: proposal.amount,
      });

      // `create` traz buyer/seller completos (mesmo include do AdminController)
      // — nunca deixamos o passwordHash de um lado vazar pro outro aqui.
      return {
        ...negotiation,
        buyer: omitPasswordHash(negotiation.buyer),
        seller: omitPasswordHash(negotiation.seller),
      };
    });
  }

  async reject(proposalId: string, userId: string) {
    const proposal = await this.proposalRepository.findById(proposalId);
    this.assertCanDecide(proposal, userId);
    if (proposal.status !== ProposalStatus.PENDENTE) {
      throw new ConflictException(`Proposta ${proposalId} já está em status ${proposal.status}`);
    }
    return this.proposalRepository.updateStatus(proposal.id, ProposalStatus.REJEITADA);
  }

  async cancel(proposalId: string, buyerId: string) {
    const proposal = await this.proposalRepository.findById(proposalId);
    if (proposal.buyerId !== buyerId) {
      throw new ForbiddenException('Apenas quem fez a proposta original pode cancelá-la');
    }
    if (proposal.status !== ProposalStatus.PENDENTE) {
      throw new ConflictException(`Proposta ${proposalId} já está em status ${proposal.status}`);
    }
    return this.proposalRepository.updateStatus(proposal.id, ProposalStatus.CANCELADA);
  }

  /** Quem decide (aceita/recusa) é sempre quem NÃO fez a proposta mais recente da thread. */
  private assertCanDecide(
    proposal: { proposedBy: ProposedBy; buyerId: string; product: { sellerId: string } },
    userId: string,
  ): void {
    const decisionMaker =
      proposal.proposedBy === ProposedBy.BUYER ? proposal.product.sellerId : proposal.buyerId;
    if (decisionMaker !== userId) {
      throw new ForbiddenException('Você não pode decidir sobre esta proposta');
    }
  }
}
