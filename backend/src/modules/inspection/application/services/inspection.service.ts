import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { assertTransition } from '../../../negotiation/domain/negotiation-state-machine';
import { PaymentChargeService } from '../../../payments/application/services/payment-charge.service';
import {
  assertChecklistComplete,
  checklistAllPassed,
} from '../../domain/inspection-checklist.types';
import { StartInspectionDto } from '../dto/start-inspection.dto';
import {
  ApproveInspectionDto,
  SubmitInspectionResultDto,
} from '../dto/submit-inspection-result.dto';

@Injectable()
export class InspectionService {
  private readonly logger = new Logger(InspectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentCharge: PaymentChargeService,
  ) {}

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
   * caso de uso — já dispara a criação da cobrança PIX com Split, movendo
   * a negociação direto para PAGAMENTO_PENDENTE. O comprador só passa a
   * ver o PIX depois que o laudo está gravado.
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

    // Fora da transação acima (mesma razão do PaymentChargeService: não
    // segurar lock de banco esperando a API do gateway responder).
    return this.paymentCharge.createChargeForNegotiation(negotiationId);
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
}
