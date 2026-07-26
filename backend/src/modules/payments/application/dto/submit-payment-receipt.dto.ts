import { IsUrl } from 'class-validator';

export class SubmitPaymentReceiptDto {
  @IsUrl()
  receiptUrl!: string;
}
