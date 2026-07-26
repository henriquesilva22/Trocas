import { IsUrl } from 'class-validator';

export class SubmitFeeReceiptDto {
  @IsUrl()
  receiptUrl!: string;
}
