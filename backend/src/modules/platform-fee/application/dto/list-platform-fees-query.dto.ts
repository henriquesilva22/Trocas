import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PlatformFeeStatus } from '@prisma/client';

export class ListPlatformFeesQueryDto {
  @IsOptional()
  @IsEnum(PlatformFeeStatus)
  status?: PlatformFeeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
