import { IsString, MinLength } from 'class-validator';

export class BanUserDto {
  @IsString()
  @MinLength(10)
  reason: string;
}
