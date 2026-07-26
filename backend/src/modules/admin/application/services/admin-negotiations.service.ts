import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { AdminActionType, NegotiationStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';
import { NegotiationRepository } from '../../../negotiation/infrastructure/negotiation.repository';
import { assertTransition } from '../../../negotiation/domain/negotiation-state-machine';
import { DisputeResolution, ResolveDisputeDto } from '../dto/resolve-dispute.dto';

@Injectable()
export class AdminNegotiationsService {
  private readonly logger = new Logger(AdminNegotiationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly negotiationRepository: NegotiationRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  list(params: { status?: NegotiationStatus; page: number; pageSize: number }) {
    return this.negotiationRepository.findManyForAdmin(params);
  }

  getDetail(id: string) {
    return this.negotiationRepository.findDetailedById(id);
  }

  /**
   * Só atua sobre negociações em EM_ANALISE — a máquina de estados
   * (negotiation-state-machine.ts) só permite dali sair para CANCELADO ou
   * de volta a INSPECIONADO_E_APROVADO, então o admin não consegue, por
   * exemplo, forçar FINALIZADO sem passar pelo pagamento de novo.
   */
  async resolveDispute(adminId: string, negotiationId: string, dto: ResolveDisputeDto) {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });

    const targetStatus: NegotiationStatus =
      dto.resolution === DisputeResolution.APROVAR ? 'INSPECIONADO_E_APROVADO' : 'CANCELADO';

    assertTransition(negotiation.status, targetStatus);

    const updated = await this.prisma.negotiation.updateMany({
      where: { id: negotiationId, status: negotiation.status },
      data: { status: targetStatus },
    });
    if (updated.count === 0) {
      throw new ConflictException(`Negociação ${negotiationId} mudou de estado antes da resolução`);
    }

    await this.auditLog.record({
      adminId,
      action:
        dto.resolution === DisputeResolution.APROVAR
          ? AdminActionType.RESOLVE_DISPUTE_APPROVE
          : AdminActionType.RESOLVE_DISPUTE_CANCEL,
      targetId: negotiationId,
      reason: dto.reason,
    });

    this.logger.log(`Admin ${adminId} resolveu disputa ${negotiationId}: EM_ANALISE -> ${targetStatus}`);

    return this.negotiationRepository.findDetailedById(negotiationId);
  }
}
