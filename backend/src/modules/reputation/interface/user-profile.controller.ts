import { Controller, Get, Param } from '@nestjs/common';
import { UserProfileService } from '../application/services/user-profile.service';

/**
 * Perfil público (item 18) — vive em `reputation` mas mapeia pra `/users`
 * (segmentos `/:id/profile`, sem colisão com `/users/me` do UsersController:
 * contagem de segmentos diferente, cada um em seu próprio controller/módulo).
 */
@Controller('users')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.userProfileService.getPublicProfile(id);
  }
}
