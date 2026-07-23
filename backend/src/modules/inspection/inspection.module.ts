import { Module } from '@nestjs/common';
import { InspectionController } from './interface/inspection.controller';
import { InspectionService } from './application/services/inspection.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  // Importa PaymentsModule para consumir o PaymentChargeService exportado
  // por ele — é assim que a aprovação da inspeção dispara a geração do PIX.
  imports: [PaymentsModule],
  controllers: [InspectionController],
  // InspectionService lida com a persistência do Inspection diretamente via
  // PrismaService (não por um repository dedicado) porque cada caso de uso
  // precisa atualizar Inspection + Negotiation atomicamente na mesma
  // transação — um repository de agregado único não cobriria isso.
  providers: [InspectionService],
  exports: [InspectionService],
})
export class InspectionModule {}
