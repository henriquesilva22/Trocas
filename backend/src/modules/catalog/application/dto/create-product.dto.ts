import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { ProductCategory, ProductCondition } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  priceAsking!: number;

  @IsString()
  @MinLength(2)
  city!: string;

  // Chega como JSON string quando enviado via multipart/form-data.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsArray()
  @IsEnum(ProductCategory, { each: true })
  acceptedCategories?: ProductCategory[];
}
