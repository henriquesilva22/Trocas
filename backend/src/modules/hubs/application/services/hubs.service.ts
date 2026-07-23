import { Injectable } from '@nestjs/common';
import { AdminActionType } from '@prisma/client';
import { HubsRepository } from '../../infrastructure/hubs.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';
import { CreateHubDto } from '../dto/create-hub.dto';
import { UpdateHubDto } from '../dto/update-hub.dto';

@Injectable()
export class HubsService {
  constructor(
    private readonly hubsRepository: HubsRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  listActive() {
    return this.hubsRepository.findAllActive();
  }

  getById(id: string) {
    return this.hubsRepository.findById(id);
  }

  async create(adminId: string, dto: CreateHubDto) {
    const hub = await this.hubsRepository.create(dto);
    await this.auditLog.record({
      adminId,
      action: AdminActionType.CREATE_HUB,
      targetId: hub.id,
    });
    return hub;
  }

  async update(adminId: string, id: string, dto: UpdateHubDto) {
    const hub = await this.hubsRepository.update(id, dto);
    await this.auditLog.record({ adminId, action: AdminActionType.UPDATE_HUB, targetId: id });
    return hub;
  }

  async deactivate(adminId: string, id: string) {
    const hub = await this.hubsRepository.deactivate(id);
    await this.auditLog.record({
      adminId,
      action: AdminActionType.DEACTIVATE_HUB,
      targetId: id,
    });
    return hub;
  }
}
