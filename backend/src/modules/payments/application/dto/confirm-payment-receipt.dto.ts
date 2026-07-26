import { IsBoolean } from 'class-validator';

export class ConfirmPaymentReceiptDto {
  @IsBoolean()
  received!: boolean;
}
