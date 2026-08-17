import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NegotiationsService } from '../application/services/negotiations.service';
import { ChooseDeliveryDto } from '../application/dto/choose-delivery.dto';
import { ChooseReceiveMethodDto } from '../application/dto/choose-receive-method.dto';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';

@Controller('negotiations')
@UseGuards(JwtAuthGuard)
export class NegotiationController {
  constructor(private readonly negotiationsService: NegotiationsService) {}

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.negotiationsService.listMine(user.id);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.negotiationsService.getDetailForUser(id, user.id);
  }

  @Post(':id/delivery')
  chooseDelivery(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChooseDeliveryDto,
  ) {
    return this.negotiationsService.chooseDelivery(id, user.id, dto);
  }

  @Post(':id/receive-method')
  chooseReceiveMethod(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChooseReceiveMethodDto,
  ) {
    return this.negotiationsService.chooseReceiveMethod(id, user.id, dto);
  }

  @Post(':id/receive-confirm')
  confirmReceived(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.negotiationsService.confirmReceivedByMe(id, user.id);
  }
}
