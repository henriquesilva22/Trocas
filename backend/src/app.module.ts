import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { NegotiationModule } from './modules/negotiation/negotiation.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InspectionModule } from './modules/inspection/inspection.module';
import { HubsModule } from './modules/hubs/hubs.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlatformFeeModule } from './modules/platform-fee/platform-fee.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { ReputationModule } from './modules/reputation/reputation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    CatalogModule,
    NegotiationModule,
    PaymentsModule,
    PlatformFeeModule,
    ShippingModule,
    InspectionModule,
    HubsModule,
    AdminModule,
    ReputationModule,
    // ChatModule segue o mesmo padrão — exporta seu repository/service e é
    // importado aqui quando existir.
  ],
})
export class AppModule {}
