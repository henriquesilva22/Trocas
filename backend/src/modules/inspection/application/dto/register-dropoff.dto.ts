import { IsString } from 'class-validator';

export class RegisterDropoffDto {
  @IsString()
  hubId!: string;
}
