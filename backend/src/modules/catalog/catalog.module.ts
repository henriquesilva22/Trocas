import { Module } from '@nestjs/common';
import { ProductsController } from './interface/products.controller';
import { ProposalsController } from './interface/proposals.controller';
import { ProductsService } from './application/services/products.service';
import { ProposalsService } from './application/services/proposals.service';
import { ProductRepository } from './infrastructure/product.repository';
import { ProposalRepository } from './infrastructure/proposal.repository';
import { StorageModule } from '../../shared/storage/storage.module';
import { NegotiationModule } from '../negotiation/negotiation.module';

@Module({
  // NegotiationModule exporta o NegotiationRepository consumido pelo
  // ProposalsService ao aceitar uma proposta (cria a Negotiation dentro da
  // mesma transação) — mesmo padrão do AdminModule importando PlatformFeeModule.
  imports: [StorageModule, NegotiationModule],
  controllers: [ProductsController, ProposalsController],
  providers: [ProductsService, ProposalsService, ProductRepository, ProposalRepository],
  exports: [ProductRepository],
})
export class CatalogModule {}
