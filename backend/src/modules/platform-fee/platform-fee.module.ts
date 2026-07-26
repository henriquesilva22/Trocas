import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformFeeController } from './interface/platform-fee.controller';
import { PlatformFeeService } from './application/services/platform-fee.service';
import { AuditLogModule } from '../../shared/audit/audit-log.module';

@Module({
  imports: [ConfigModule, AuditLogModule],
  controllers: [PlatformFeeController],
  // Consumido pelo AdminModule (confirmação da cobrança é ação de admin).
  providers: [PlatformFeeService],
  exports: [PlatformFeeService],
})
export class PlatformFeeModule {}
