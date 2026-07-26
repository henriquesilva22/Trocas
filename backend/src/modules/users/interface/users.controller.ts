import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from '../application/services/users.service';
import { UpdateProfileDto } from '../application/dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getById(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
