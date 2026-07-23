import { Injectable, Logger } from '@nestjs/common';
import { AdminActionType, UserRole } from '@prisma/client';
import { AdminUsersRepository } from '../../infrastructure/admin-users.repository';
import { AuditLogService } from '../../../../shared/audit/audit-log.service';
import { BanUserDto } from '../dto/ban-user.dto';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly usersRepository: AdminUsersRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  list(params: { role?: UserRole; page: number; pageSize: number }) {
    return this.usersRepository.findMany(params);
  }

  getById(id: string) {
    return this.usersRepository.findByIdSafe(id);
  }

  async ban(adminId: string, userId: string, dto: BanUserDto) {
    const user = await this.usersRepository.setBanned(userId, true);
    await this.auditLog.record({
      adminId,
      action: AdminActionType.BAN_USER,
      targetId: userId,
      reason: dto.reason,
    });
    this.logger.log(`Admin ${adminId} baniu o usuário ${userId}`);
    return user;
  }

  async unban(adminId: string, userId: string) {
    const user = await this.usersRepository.setBanned(userId, false);
    await this.auditLog.record({ adminId, action: AdminActionType.UNBAN_USER, targetId: userId });
    this.logger.log(`Admin ${adminId} desbaniu o usuário ${userId}`);
    return user;
  }
}
