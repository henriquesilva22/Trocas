import { Module } from '@nestjs/common';
import { NegotiationRepository } from './infrastructure/negotiation.repository';

@Module({
  providers: [NegotiationRepository],
  exports: [NegotiationRepository],
})
export class NegotiationModule {}
