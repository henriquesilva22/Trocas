import { Module } from '@nestjs/common';
import { HubsController } from './interface/hubs.controller';
import { HubsService } from './application/services/hubs.service';
import { HubsRepository } from './infrastructure/hubs.repository';
import { AuditLogModule } from '../../shared/audit/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [HubsController],
  providers: [HubsService, HubsRepository],
  exports: [HubsService],
})
export class HubsModule {}
