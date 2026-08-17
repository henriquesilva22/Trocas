import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ShippingService } from '../application/services/shipping.service';
import { SubmitShippingReceiptDto } from '../application/dto/submit-shipping-receipt.dto';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';

/** Sem @Roles — cada usuário só enxerga a própria cobrança (payerId = user.id). */
@Controller('negotiations/:negotiationId/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  get(@Param('negotiationId') negotiationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.shippingService.getForUser(negotiationId, user.id);
  }

  @Post('receipt')
  submitReceipt(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitShippingReceiptDto,
  ) {
    return this.shippingService.submitReceipt(negotiationId, user.id, dto.receiptUrl);
  }
}
