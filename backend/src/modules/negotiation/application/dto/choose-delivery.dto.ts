import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DeliveryMethod } from '@prisma/client';

export class ChooseDeliveryDto {
  @IsEnum(DeliveryMethod)
  method!: DeliveryMethod;

  // Obrigatório na prática quando method = PRESENCIAL, mas não validado
  // cruzado aqui — o formulário do frontend só mostra o campo nesse caso.
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
