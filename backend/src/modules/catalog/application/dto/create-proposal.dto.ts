import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProposalDto {
  // Produto do próprio comprador oferecido em troca. Ausente = proposta 100% em dinheiro.
  @IsOptional()
  @IsUUID()
  offeredProductId?: string;

  // Diferença em dinheiro — pode ser 0 numa troca de valores equivalentes.
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  message?: string;
}
