import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { NegotiationRepository } from '../../infrastructure/negotiation.repository';
import { ChooseDeliveryDto } from '../dto/choose-delivery.dto';
import { ChooseReceiveMethodDto } from '../dto/choose-receive-method.dto';
import { omitPasswordHash } from '../../../../shared/security/sanitize-user';
import { assertTransition } from '../../domain/negotiation-state-machine';
import { isReceiveComplete } from '../../domain/receive-completion';
import { ShippingService } from '../../../shipping/application/services/shipping.service';

@Injectable()
export class NegotiationsService {
  constructor(
    private readonly negotiationRepository: NegotiationRepository,
    private readonly shippingService: ShippingService,
  ) {}

  listMine(userId: string) {
    return this.negotiationRepository.findManyForUser(userId);
  }

  async getDetailForUser(id: string, userId: string) {
    const negotiation = await this.negotiationRepository.findDetailedById(id);
    if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
      throw new ForbiddenException('Você não é parte desta negociação');
    }
    return this.sanitize(negotiation);
  }

  /** Cada lado escolhe o próprio método/agenda de entrega, de forma independente. */
  async chooseDelivery(id: string, userId: string, dto: ChooseDeliveryDto) {
    const negotiation = await this.negotiationRepository.findById(id);
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    if (negotiation.buyerId === userId) {
      const updated = await this.negotiationRepository.updateDelivery(id, {
        buyerDeliveryMethod: dto.method,
        buyerScheduledAt: scheduledAt,
      });
      return this.sanitize(updated);
    }
    if (negotiation.sellerId === userId) {
      const updated = await this.negotiationRepository.updateDelivery(id, {
        sellerDeliveryMethod: dto.method,
        sellerScheduledAt: scheduledAt,
      });
      return this.sanitize(updated);
    }
    throw new ForbiddenException('Você não é parte desta negociação');
  }

  /**
   * Item 14: depois que os dois produtos passam pela inspeção (`PIN_GERADO`),
   * cada lado escolhe independentemente retirar no Hub ou receber por envio
   * (com frete). Vendedor só tem o que "receber de volta" se a proposta
   * aceita foi uma troca por produto (offeredProductId) — venda 100% em
   * dinheiro não tem lado do vendedor pra receber aqui.
   */
  async chooseReceiveMethod(id: string, userId: string, dto: ChooseReceiveMethodDto) {
    const negotiation = await this.negotiationRepository.findById(id);
    if (negotiation.status !== 'PIN_GERADO') {
      throw new ConflictException(
        `Negociação ${id} ainda não está liberada pra escolher recebimento (status: ${negotiation.status})`,
      );
    }

    const isBuyer = negotiation.buyerId === userId;
    const isSeller = negotiation.sellerId === userId;
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Você não é parte desta negociação');
    }
    if (isSeller && !negotiation.offeredProductId) {
      throw new ConflictException('Esta troca não teve produto oferecido — não há nada a receber do lado do vendedor');
    }

    if (dto.method === 'ENVIO') {
      await this.shippingService.createCharge(id, isBuyer ? 'BUYER' : 'SELLER', userId);
    }

    const updated = await this.negotiationRepository.updateReceive(
      id,
      isBuyer ? { buyerReceiveMethod: dto.method } : { sellerReceiveMethod: dto.method },
    );
    return this.sanitize(updated);
  }

  /**
   * Autodeclaração de "recebi meu produto" — só faz sentido pra quem
   * escolheu ENVIO (retirada no Hub é confirmada pelo técnico, não pelo
   * próprio usuário, ver `InspectionService.confirmHandover`). Sem
   * integração real de transportadora não tem como validar isso do lado do
   * servidor, então confiamos na palavra do usuário — igual qualquer
   * marketplace sem rastreio automático.
   */
  async confirmReceivedByMe(id: string, userId: string) {
    const negotiation = await this.negotiationRepository.findById(id);
    if (negotiation.status !== 'PIN_GERADO') {
      throw new ConflictException(`Negociação ${id} não está aguardando recebimento`);
    }

    const isBuyer = negotiation.buyerId === userId;
    const isSeller = negotiation.sellerId === userId;
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Você não é parte desta negociação');
    }

    const method = isBuyer ? negotiation.buyerReceiveMethod : negotiation.sellerReceiveMethod;
    if (method !== 'ENVIO') {
      throw new ConflictException('Confirmação autodeclarada só se aplica a quem escolheu receber por envio');
    }

    let updated = await this.negotiationRepository.updateReceive(
      id,
      isBuyer ? { buyerReceivedAt: new Date() } : { sellerReceivedAt: new Date() },
    );

    if (isReceiveComplete(updated)) {
      assertTransition('PIN_GERADO', 'FINALIZADO');
      updated = await this.negotiationRepository.updateReceive(id, { status: 'FINALIZADO' });
    }

    return this.sanitize(updated);
  }

  /**
   * `findDetailedById`/`updateDelivery` incluem `buyer`/`seller` completos
   * (mesmo include usado pelo AdminController) — nunca deixamos o hash da
   * senha de um dos lados vazar pro outro através dessa rota.
   */
  private sanitize<T extends { buyer: { passwordHash: string }; seller: { passwordHash: string } }>(
    negotiation: T,
  ) {
    return {
      ...negotiation,
      buyer: omitPasswordHash(negotiation.buyer),
      seller: omitPasswordHash(negotiation.seller),
    };
  }
}
