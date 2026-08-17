import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { NegotiationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { assertTransition } from '../../../negotiation/domain/negotiation-state-machine';
import { PaymentService } from '../../../payments/application/services/payment.service';
import {
  assertChecklistComplete,
  checklistAllPassed,
} from '../../domain/inspection-checklist.types';
import { isReceiveComplete } from '../../../negotiation/domain/receive-completion';
import { StartInspectionDto } from '../dto/start-inspection.dto';
import {
  ApproveInspectionDto,
  SubmitInspectionResultDto,
} from '../dto/submit-inspection-result.dto';

const SAFE_PARTY_SELECT = { id: true, name: true } satisfies Prisma.UserSelect;

const QUEUE_INCLUDE = {
  product: true,
  offeredProduct: true,
  buyer: { select: SAFE_PARTY_SELECT },
  seller: { select: SAFE_PARTY_SELECT },
  hub: true,
} satisfies Prisma.NegotiationInclude;

const QUEUE_STATUSES: NegotiationStatus[] = ['EM_CUSTODIA_FISICA', 'EM_INSPECAO'];

@Injectable()
export class InspectionService {
  private readonly logger = new Logger(InspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  /** Fila de trocas aguardando ou em inspeção — painel do técnico (item 11). */
  listQueue(hubId?: string) {
    return this.prisma.negotiation.findMany({
      where: { status: { in: QUEUE_STATUSES }, ...(hubId ? { hubId } : {}) },
      include: QUEUE_INCLUDE,
      orderBy: { droppedOffAt: 'asc' },
    });
  }

  getQueueItem(id: string) {
    return this.prisma.negotiation.findUniqueOrThrow({
      where: { id },
      include: { ...QUEUE_INCLUDE, inspection: true },
    });
  }

  /** Vendedor entrega o produto fisicamente no Hub. */
  async registerDropoff(negotiationId: string, hubId: string): Promise<void> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    assertTransition(negotiation.status, 'EM_CUSTODIA_FISICA');

    const updated = await this.prisma.negotiation.updateMany({
      where: { id: negotiationId, status: negotiation.status },
      data: { status: 'EM_CUSTODIA_FISICA', hubId, droppedOffAt: new Date() },
    });
    if (updated.count === 0) {
      throw new ConflictException(`Negociação ${negotiationId} mudou de estado durante o dropoff`);
    }
  }

  /** Técnico abre a inspeção e assume a responsabilidade pelo item. */
  async startInspection(
    negotiationId: string,
    technicianId: string,
    dto: StartInspectionDto,
  ): Promise<void> {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    assertTransition(negotiation.status, 'EM_INSPECAO');

    await this.prisma.$transaction(async (tx) => {
      await tx.inspection.create({
        data: {
          negotiationId,
          hubId: dto.hubId,
          technicianId,
          checklist: {},
        },
      });

      const updated = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'EM_INSPECAO' },
      });
      if (updated.count === 0) {
        throw new ConflictException(`Negociação ${negotiationId} mudou de estado ao iniciar inspeção`);
      }
    });
  }

  /**
   * Aprova o item: lacra, sobe o laudo e — na sequência, dentro do mesmo
   * caso de uso — já libera a tela de pagamento (valor + chave PIX do
   * vendedor), movendo a negociação direto para PAGAMENTO_PENDENTE. O
   * comprador só passa a ver o PIX depois que o laudo está gravado.
   */
  async approve(negotiationId: string, technicianId: string, dto: ApproveInspectionDto) {
    assertChecklistComplete(dto.checklist);
    if (!checklistAllPassed(dto.checklist)) {
      throw new ConflictException(
        'Checklist contém itens reprovados — use o fluxo de reprovação, não aprovação',
      );
    }

    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    assertTransition(negotiation.status, 'INSPECIONADO_E_APROVADO');

    await this.prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.findUniqueOrThrow({ where: { negotiationId } });
      if (inspection.technicianId !== technicianId) {
        throw new ConflictException('Apenas o técnico que iniciou a inspeção pode concluí-la');
      }

      await tx.inspection.update({
        where: { negotiationId },
        data: {
          checklist: dto.checklist as unknown as Prisma.InputJsonValue,
          photoUrls: dto.photoUrls,
          videoUrl: dto.videoUrl,
          reportUrl: dto.reportUrl,
          shelfLocation: dto.shelfLocation,
          sealCode: dto.sealCode,
          approved: true,
          finishedAt: new Date(),
        },
      });

      const updated = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'INSPECIONADO_E_APROVADO' },
      });
      if (updated.count === 0) {
        throw new ConflictException(`Negociação ${negotiationId} mudou de estado durante a aprovação`);
      }
    });

    this.logger.log(`Negociação ${negotiationId}: EM_INSPECAO -> INSPECIONADO_E_APROVADO`);

    return this.paymentService.initiatePayment(negotiationId);
  }

  async reject(negotiationId: string, technicianId: string, dto: SubmitInspectionResultDto) {
    assertChecklistComplete(dto.checklist);

    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    assertTransition(negotiation.status, 'INSPECIONADO_REPROVADO');

    await this.prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.findUniqueOrThrow({ where: { negotiationId } });
      if (inspection.technicianId !== technicianId) {
        throw new ConflictException('Apenas o técnico que iniciou a inspeção pode concluí-la');
      }

      await tx.inspection.update({
        where: { negotiationId },
        data: {
          checklist: dto.checklist as unknown as Prisma.InputJsonValue,
          photoUrls: dto.photoUrls,
          videoUrl: dto.videoUrl,
          approved: false,
          finishedAt: new Date(),
        },
      });

      const updated = await tx.negotiation.updateMany({
        where: { id: negotiationId, status: negotiation.status },
        data: { status: 'INSPECIONADO_REPROVADO' },
      });
      if (updated.count === 0) {
        throw new ConflictException(`Negociação ${negotiationId} mudou de estado durante a reprovação`);
      }
    });

    this.logger.log(`Negociação ${negotiationId}: EM_INSPECAO -> INSPECIONADO_REPROVADO`);

    // TODO: publicar evento para o módulo de logística organizar a
    // devolução do produto ao vendedor.
  }

  /**
   * Técnico confirma que entregou o item no balcão do Hub pro comprador ou
   * pro vendedor (item 15) — exige o PIN mostrado pelo usuário. Assim que os
   * dois lados aplicáveis estiverem confirmados (retirada OU envio
   * autodeclarado), a negociação vira FINALIZADO.
   */
  async confirmHandover(
    negotiationId: string,
    technicianId: string,
    side: 'BUYER' | 'SELLER',
    pin: string,
  ) {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });

    if (negotiation.status !== 'PIN_GERADO') {
      throw new ConflictException(
        `Negociação ${negotiationId} não está liberada pra retirada (status atual: ${negotiation.status})`,
      );
    }
    if (!negotiation.pickupPin || negotiation.pickupPin !== pin) {
      throw new ForbiddenException('PIN de retirada incorreto');
    }

    const receiveMethod = side === 'BUYER' ? negotiation.buyerReceiveMethod : negotiation.sellerReceiveMethod;
    if (receiveMethod === 'ENVIO') {
      throw new ConflictException('Este lado escolheu receber por envio, não por retirada no Hub');
    }

    const updated = await this.prisma.negotiation.update({
      where: { id: negotiationId },
      data:
        side === 'BUYER'
          ? { buyerReceiveMethod: 'RETIRADA_HUB', buyerReceivedAt: new Date() }
          : { sellerReceiveMethod: 'RETIRADA_HUB', sellerReceivedAt: new Date() },
    });

    this.logger.log(`Técnico ${technicianId} confirmou retirada (${side}) da negociação ${negotiationId}`);

    if (isReceiveComplete(updated)) {
      assertTransition('PIN_GERADO', 'FINALIZADO');
      return this.prisma.negotiation.update({
        where: { id: negotiationId },
        data: { status: 'FINALIZADO' },
      });
    }

    return updated;
  }
}
