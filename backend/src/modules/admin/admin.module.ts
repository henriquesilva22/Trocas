import { Module } from '@nestjs/common';
import { AdminController } from './interface/admin.controller';
import { AdminNegotiationsService } from './application/services/admin-negotiations.service';
import { AdminUsersService } from './application/services/admin-users.service';
import { AdminUsersRepository } from './infrastructure/admin-users.repository';
import { NegotiationModule } from '../negotiation/negotiation.module';
import { AuditLogModule } from '../../shared/audit/audit-log.module';

@Module({
  // NegotiationModule exporta o NegotiationRepository consumido pelo
  // dashboard/disputas; AuditLogModule é o mesmo serviço compartilhado que
  // o HubsModule usa — nenhum módulo de domínio depende do AdminModule.
  imports: [NegotiationModule, AuditLogModule],
  controllers: [AdminController],
  providers: [AdminNegotiationsService, AdminUsersService, AdminUsersRepository],
})
export class AdminModule {}
