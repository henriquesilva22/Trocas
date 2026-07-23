import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Rejeita qualquer campo fora do DTO e converte tipos automaticamente —
  // única barreira de validação de payload antes de chegar nos services.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // Necessário guardar o corpo cru (raw) do request para validar a
  // assinatura HMAC dos webhooks do Mercado Pago/Asaas — depois que o
  // body-parser padrão faz JSON.parse, o buffer original se perde.
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });

  // Render/Koyeb Free injetam a porta via env PORT.
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
