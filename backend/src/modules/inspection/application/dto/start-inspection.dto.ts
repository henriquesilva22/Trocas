import { IsString } from 'class-validator';

export class StartInspectionDto {
  @IsString()
  hubId!: string;
}
