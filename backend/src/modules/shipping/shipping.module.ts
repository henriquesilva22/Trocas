import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShippingController } from './interface/shipping.controller';
import { ShippingService } from './application/services/shipping.service';
import { AuditLogModule } from '../../shared/audit/audit-log.module';

@Module({
  imports: [ConfigModule, AuditLogModule],
  controllers: [ShippingController],
  // Consumido pelo NegotiationModule (criar cobrança ao escolher ENVIO) e
  // pelo InspectionModule (técnico digita o código de rastreio) e AdminModule
  // (confirmação da cobrança).
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
