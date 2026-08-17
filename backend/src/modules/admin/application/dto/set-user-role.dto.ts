import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SetUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
