import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './interface/auth.controller';
import { UsersController } from './interface/users.controller';
import { UsersService } from './application/services/users.service';
import { JwtAuthGuard } from './interface/jwt-auth.guard';

// @Global() porque o JwtAuthGuard passa a ser usado por praticamente todo
// controller do sistema (mesmo motivo do PrismaModule) — evita reimportar
// UsersModule em cada módulo de domínio só pra ter acesso ao guard.
@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      global: true, // @Global() no UsersModule não propaga pros imports dele
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [UsersService, JwtAuthGuard],
  exports: [JwtAuthGuard, UsersService],
})
export class UsersModule {}
