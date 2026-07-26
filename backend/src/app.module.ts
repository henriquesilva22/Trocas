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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    NegotiationModule,
    PaymentsModule,
    PlatformFeeModule,
    InspectionModule,
    HubsModule,
    AdminModule,
    // CatalogModule, ChatModule e ReputationModule seguem o mesmo padrão —
    // cada um exporta seu repository/service e é importado aqui.
  ],
})
export class AppModule {}
