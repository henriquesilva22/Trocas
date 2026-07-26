import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Rejeita qualquer campo fora do DTO e converte tipos automaticamente —
  // única barreira de validação de payload antes de chegar nos services.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });

  // Render/Koyeb Free injetam a porta via env PORT.
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
