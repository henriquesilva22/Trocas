import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlatformFeeService } from '../application/services/platform-fee.service';
import { SubmitFeeReceiptDto } from '../application/dto/submit-fee-receipt.dto';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
// import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard'; // TODO quando UsersModule existir

/**
 * Sem @Roles — comprador e vendedor pagam a mesma taxa, cada um enxerga só
 * a própria cobrança (resolvida por payerId dentro do PlatformFeeService).
 */
@Controller('negotiations/:negotiationId/platform-fee')
@UseGuards(/* JwtAuthGuard, */ RolesGuard)
export class PlatformFeeController {
  constructor(private readonly platformFeeService: PlatformFeeService) {}

  @Get()
  get(@Param('negotiationId') negotiationId: string) {
    return this.platformFeeService.getForNegotiation(negotiationId);
  }

  @Post('receipt')
  submitReceipt(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitFeeReceiptDto,
  ) {
    return this.platformFeeService.submitReceipt(negotiationId, user.id, dto.receiptUrl);
  }
}
