import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProposalsService } from '../application/services/proposals.service';
import { CreateProposalDto } from '../application/dto/create-proposal.dto';
import { CounterProposalDto } from '../application/dto/counter-proposal.dto';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('products/:productId/proposals')
  create(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.create(productId, user.id, dto);
  }

  @Get('products/:productId/proposals')
  listForProduct(@Param('productId') productId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proposalsService.listForProduct(productId, user.id);
  }

  @Get('products/:productId/proposals/mine')
  listMineForProduct(@Param('productId') productId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proposalsService.listMineForProduct(productId, user.id);
  }

  @Post('proposals/:id/counter')
  counter(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CounterProposalDto,
  ) {
    return this.proposalsService.counter(id, user.id, dto);
  }

  @Post('proposals/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proposalsService.accept(id, user.id);
  }

  @Post('proposals/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proposalsService.reject(id, user.id);
  }

  @Post('proposals/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proposalsService.cancel(id, user.id);
  }
}
