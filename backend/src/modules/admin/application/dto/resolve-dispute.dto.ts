import { IsEnum, IsString, MinLength } from 'class-validator';

export enum DisputeResolution {
  APROVAR = 'APROVAR', // Retoma o fluxo: EM_DISPUTA -> INSPECIONADO_E_APROVADO
  CANCELAR = 'CANCELAR', // Encerra a negociação: EM_DISPUTA -> CANCELADO
}

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  resolution!: DisputeResolution;

  // Motivo obrigatório — vira o registro de auditoria da decisão.
  @IsString()
  @MinLength(10)
  reason!: string;
}
