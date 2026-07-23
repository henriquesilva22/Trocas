import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() porque toda a plataforma depende do Prisma — evita reimportar
// em cada módulo de domínio.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
