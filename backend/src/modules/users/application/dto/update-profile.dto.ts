import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length, IsUrl } from 'class-validator';
import { PixKeyType } from '@prisma/client';

const onlyDigits = ({ value }: { value?: string }) => value?.replace(/\D/g, '') || undefined;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  pixKey?: string;

  // Não assume que toda chave PIX é CPF — o usuário diz o tipo.
  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @IsOptional()
  @Transform(onlyDigits)
  @IsString()
  @Length(10, 11, { message: 'Telefone deve ter 10 ou 11 dígitos (com DDD)' })
  phone?: string;

  @IsOptional()
  @Transform(onlyDigits)
  @IsString()
  @Length(11, 11, { message: 'CPF deve ter 11 dígitos' })
  cpf?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
