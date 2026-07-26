import { IsLatitude, IsLongitude, IsString, MinLength } from 'class-validator';

export class CreateHubDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @MinLength(5)
  address!: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}
