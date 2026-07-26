import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { InspectionService } from '../application/services/inspection.service';
import { RegisterDropoffDto } from '../application/dto/register-dropoff.dto';
import { StartInspectionDto } from '../application/dto/start-inspection.dto';
import {
  ApproveInspectionDto,
  SubmitInspectionResultDto,
} from '../application/dto/submit-inspection-result.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';

@Controller('negotiations/:negotiationId/inspection')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Post('dropoff')
  registerDropoff(
    @Param('negotiationId') negotiationId: string,
    @Body() dto: RegisterDropoffDto,
  ) {
    return this.inspectionService.registerDropoff(negotiationId, dto.hubId);
  }

  @Post('start')
  @Roles('TECHNICIAN')
  startInspection(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartInspectionDto,
  ) {
    return this.inspectionService.startInspection(negotiationId, user.id, dto);
  }

  @Post('approve')
  @Roles('TECHNICIAN')
  approve(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApproveInspectionDto,
  ) {
    return this.inspectionService.approve(negotiationId, user.id, dto);
  }

  @Post('reject')
  @Roles('TECHNICIAN')
  reject(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitInspectionResultDto,
  ) {
    return this.inspectionService.reject(negotiationId, user.id, dto);
  }
}
