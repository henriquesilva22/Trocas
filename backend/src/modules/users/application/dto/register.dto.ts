import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

// Frontend formata pra exibição (000.000.000-00, (00) 00000-0000); banco
// guarda só dígitos — o @Transform roda antes da validação de tamanho.
const onlyDigits = ({ value }: { value?: string }) => value?.replace(/\D/g, '') || undefined;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

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
}
