import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Rejeita qualquer campo fora do DTO e converte tipos automaticamente —
  // única barreira de validação de payload antes de chegar nos services.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // FRONTEND_URL guarda a URL de produção (Vercel) — sem isso, qualquer
  // frontend rodando localmente (npm run dev, porta 3001) é bloqueado pelo
  // CORS antes mesmo de chegar no controller.
  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [...configuredOrigins, 'http://localhost:3001'],
    credentials: true,
  });

  // Render/Koyeb Free injetam a porta via env PORT.
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
