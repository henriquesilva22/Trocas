import { IsString, MinLength } from 'class-validator';

export class SetTrackingCodeDto {
  @IsString()
  @MinLength(4)
  trackingCode!: string;
}
