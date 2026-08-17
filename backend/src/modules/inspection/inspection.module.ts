import { Module } from '@nestjs/common';
import { InspectionController } from './interface/inspection.controller';
import { TechnicianController } from './interface/technician.controller';
import { InspectionService } from './application/services/inspection.service';
import { PaymentsModule } from '../payments/payments.module';
import { ShippingModule } from '../shipping/shipping.module';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  // PaymentsModule: aprovação da inspeção libera a tela de PIX (PaymentService).
  // ShippingModule: técnico digita o código de rastreio de um envio (item 16).
  // StorageModule: upload das fotos da inspeção física.
  imports: [PaymentsModule, ShippingModule, StorageModule],
  controllers: [InspectionController, TechnicianController],
  // InspectionService lida com a persistência do Inspection diretamente via
  // PrismaService (não por um repository dedicado) porque cada caso de uso
  // precisa atualizar Inspection + Negotiation atomicamente na mesma
  // transação — um repository de agregado único não cobriria isso.
  providers: [InspectionService],
  exports: [InspectionService],
})
export class InspectionModule {}
