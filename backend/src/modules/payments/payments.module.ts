import { Module } from '@nestjs/common';
import { PaymentController } from './interface/payment.controller';
import { PaymentService } from './application/services/payment.service';

@Module({
  controllers: [PaymentController],
  // PaymentService é consumido pelo InspectionModule ao aprovar um item.
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentsModule {}
