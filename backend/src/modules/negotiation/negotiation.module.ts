import { Module } from '@nestjs/common';
import { NegotiationRepository } from './infrastructure/negotiation.repository';
import { NegotiationsService } from './application/services/negotiations.service';
import { NegotiationController } from './interface/negotiation.controller';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  // ShippingModule: escolher ENVIO como forma de receber cria a cobrança de frete.
  imports: [ShippingModule],
  controllers: [NegotiationController],
  providers: [NegotiationRepository, NegotiationsService],
  exports: [NegotiationRepository],
})
export class NegotiationModule {}
