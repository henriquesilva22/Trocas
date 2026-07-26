import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminNegotiationsService } from '../application/services/admin-negotiations.service';
import { AdminUsersService } from '../application/services/admin-users.service';
import { PlatformFeeService } from '../../platform-fee/application/services/platform-fee.service';
import { ListNegotiationsQueryDto } from '../application/dto/list-negotiations-query.dto';
import { ListUsersQueryDto } from '../application/dto/list-users-query.dto';
import { ListPlatformFeesQueryDto } from '../../platform-fee/application/dto/list-platform-fees-query.dto';
import { ResolveDisputeDto } from '../application/dto/resolve-dispute.dto';
import { BanUserDto } from '../application/dto/ban-user.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
// import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard'; // TODO quando UsersModule existir

/**
 * Todo endpoint aqui é restrito a ADMIN e cada ação de escrita grava uma
 * entrada em AdminAuditLog (via AuditLogService, nos services). Depende do
 * mesmo JwtAuthGuard pendente que os demais módulos — ver comentário nos
 * outros controllers.
 */
@Controller('admin')
@UseGuards(/* JwtAuthGuard, */ RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly negotiationsService: AdminNegotiationsService,
    private readonly usersService: AdminUsersService,
    private readonly platformFeeService: PlatformFeeService,
  ) {}

  @Get('negotiations')
  listNegotiations(@Query() query: ListNegotiationsQueryDto) {
    return this.negotiationsService.list(query);
  }

  @Get('negotiations/:id')
  getNegotiation(@Param('id') id: string) {
    return this.negotiationsService.getDetail(id);
  }

  @Post('negotiations/:id/resolve-dispute')
  resolveDispute(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') negotiationId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.negotiationsService.resolveDispute(admin.id, negotiationId, dto);
  }

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Patch('users/:id/ban')
  banUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.usersService.ban(admin.id, userId, dto);
  }

  @Patch('users/:id/unban')
  unbanUser(@CurrentUser() admin: AuthenticatedUser, @Param('id') userId: string) {
    return this.usersService.unban(admin.id, userId);
  }

  @Get('platform-fees')
  listPlatformFees(@Query() query: ListPlatformFeesQueryDto) {
    return this.platformFeeService.list(query);
  }

  @Post('platform-fees/:chargeId/confirm')
  confirmPlatformFee(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('chargeId') chargeId: string,
  ) {
    return this.platformFeeService.confirmCharge(chargeId, admin.id);
  }
}
