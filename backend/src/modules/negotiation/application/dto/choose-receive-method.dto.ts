import { IsEnum } from 'class-validator';
import { ReceiveMethod } from '@prisma/client';

export class ChooseReceiveMethodDto {
  @IsEnum(ReceiveMethod)
  method!: ReceiveMethod;
}
