import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { HubsService } from '../application/services/hubs.service';
import { CreateHubDto } from '../application/dto/create-hub.dto';
import { UpdateHubDto } from '../application/dto/update-hub.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
// import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard'; // TODO quando UsersModule existir

@Controller('hubs')
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  /** Lista pública dos Hubs ativos — alimenta o mapa Leaflet do frontend. */
  @Get()
  listActive() {
    return this.hubsService.listActive();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.hubsService.getById(id);
  }

  @Post()
  @UseGuards(/* JwtAuthGuard, */ RolesGuard)
  @Roles('ADMIN')
  create(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateHubDto) {
    return this.hubsService.create(admin.id, dto);
  }

  @Patch(':id')
  @UseGuards(/* JwtAuthGuard, */ RolesGuard)
  @Roles('ADMIN')
  update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHubDto,
  ) {
    return this.hubsService.update(admin.id, id, dto);
  }

  @Post(':id/deactivate')
  @UseGuards(/* JwtAuthGuard, */ RolesGuard)
  @Roles('ADMIN')
  deactivate(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.hubsService.deactivate(admin.id, id);
  }
}
