import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from '../application/services/payment.service';
import { SubmitPaymentReceiptDto } from '../application/dto/submit-payment-receipt.dto';
import { ConfirmPaymentReceiptDto } from '../application/dto/confirm-payment-receipt.dto';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';

/**
 * Sem @Roles — comprador e vendedor têm o mesmo role (CUSTOMER), a
 * autorização real é "é o buyerId/sellerId desta negociação", verificada
 * dentro do PaymentService.
 */
@Controller('negotiations/:negotiationId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  get(@Param('negotiationId') negotiationId: string) {
    return this.paymentService.getForNegotiation(negotiationId);
  }

  @Post('receipt')
  submitReceipt(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitPaymentReceiptDto,
  ) {
    return this.paymentService.submitReceipt(negotiationId, user.id, dto.receiptUrl);
  }

  @Post('confirm')
  confirmReceipt(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmPaymentReceiptDto,
  ) {
    return this.paymentService.confirmReceipt(negotiationId, user.id, dto.received);
  }
}
