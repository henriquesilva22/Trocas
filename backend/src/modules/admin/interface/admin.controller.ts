import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminNegotiationsService } from '../application/services/admin-negotiations.service';
import { AdminUsersService } from '../application/services/admin-users.service';
import { AdminDashboardService } from '../application/services/admin-dashboard.service';
import { PlatformFeeService } from '../../platform-fee/application/services/platform-fee.service';
import { ShippingService } from '../../shipping/application/services/shipping.service';
import { ListNegotiationsQueryDto } from '../application/dto/list-negotiations-query.dto';
import { ListUsersQueryDto } from '../application/dto/list-users-query.dto';
import { ListPaymentsQueryDto } from '../application/dto/list-payments-query.dto';
import { ListPlatformFeesQueryDto } from '../../platform-fee/application/dto/list-platform-fees-query.dto';
import { ListShippingQueryDto } from '../../shipping/application/dto/list-shipping-query.dto';
import { ResolveDisputeDto } from '../application/dto/resolve-dispute.dto';
import { BanUserDto } from '../application/dto/ban-user.dto';
import { SetUserRoleDto } from '../application/dto/set-user-role.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';

/**
 * Todo endpoint aqui é restrito a ADMIN e cada ação de escrita grava uma
 * entrada em AdminAuditLog (via AuditLogService, nos services).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly negotiationsService: AdminNegotiationsService,
    private readonly usersService: AdminUsersService,
    private readonly platformFeeService: PlatformFeeService,
    private readonly shippingService: ShippingService,
    private readonly dashboardService: AdminDashboardService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.dashboardService.getStats();
  }

  @Get('payments')
  listPayments(@Query() query: ListPaymentsQueryDto) {
    return this.negotiationsService.listPayments(query);
  }

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

  @Patch('users/:id/role')
  setUserRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: SetUserRoleDto,
  ) {
    return this.usersService.setRole(admin.id, userId, dto);
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

  @Get('shipping')
  listShipping(@Query() query: ListShippingQueryDto) {
    return this.shippingService.list(query);
  }

  @Post('shipping/:chargeId/confirm')
  confirmShipping(@CurrentUser() admin: AuthenticatedUser, @Param('chargeId') chargeId: string) {
    return this.shippingService.confirmCharge(chargeId, admin.id);
  }
}
