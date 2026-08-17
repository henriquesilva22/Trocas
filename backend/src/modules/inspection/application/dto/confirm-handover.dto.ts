import { IsIn, IsString, Length } from 'class-validator';

export class ConfirmHandoverDto {
  @IsIn(['BUYER', 'SELLER'])
  side!: 'BUYER' | 'SELLER';

  @IsString()
  @Length(6, 6)
  pin!: string;
}
