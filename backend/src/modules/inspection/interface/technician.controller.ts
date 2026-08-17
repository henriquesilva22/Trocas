import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InspectionService } from '../application/services/inspection.service';
import { ConfirmHandoverDto } from '../application/dto/confirm-handover.dto';
import { ShippingService } from '../../shipping/application/services/shipping.service';
import { SetTrackingCodeDto } from '../../shipping/application/dto/set-tracking-code.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';

/**
 * Interface própria do técnico do Hub — deliberadamente separada da UI do
 * usuário (item 11). Reaproveita os casos de uso de start/approve/reject que
 * já existem em InspectionController; aqui só entram fila e handover.
 */
@Controller('technician')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TECHNICIAN')
export class TechnicianController {
  constructor(
    private readonly inspectionService: InspectionService,
    private readonly shippingService: ShippingService,
  ) {}

  @Get('queue')
  queue(@Query('hubId') hubId?: string) {
    return this.inspectionService.listQueue(hubId);
  }

  @Get('negotiations/:id')
  getQueueItem(@Param('id') id: string) {
    return this.inspectionService.getQueueItem(id);
  }

  @Post('negotiations/:id/handover')
  confirmHandover(
    @Param('id') id: string,
    @CurrentUser() technician: AuthenticatedUser,
    @Body() dto: ConfirmHandoverDto,
  ) {
    return this.inspectionService.confirmHandover(id, technician.id, dto.side, dto.pin);
  }

  @Post('shipping/:chargeId/tracking-code')
  setTrackingCode(@Param('chargeId') chargeId: string, @Body() dto: SetTrackingCodeDto) {
    return this.shippingService.setTrackingCode(chargeId, dto.trackingCode);
  }
}
