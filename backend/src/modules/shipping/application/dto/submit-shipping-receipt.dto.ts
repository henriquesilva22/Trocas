import { IsUrl } from 'class-validator';

export class SubmitShippingReceiptDto {
  @IsUrl()
  receiptUrl!: string;
}
