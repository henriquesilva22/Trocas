import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cpf: true,
  avatarUrl: true,
  role: true,
  pixKey: true,
  trustScore: true,
  isBanned: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        cpf: dto.cpf,
        passwordHash,
        role: 'CUSTOMER',
      },
      select: SAFE_USER_SELECT,
    });

    return { accessToken: this.generateToken(user.id, user.role), user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Mensagem genérica de propósito — não revela se foi o e-mail ou a
    // senha que errou (evita enumeração de contas cadastradas).
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    if (user.isBanned) {
      throw new ForbiddenException('Esta conta está banida');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { accessToken: this.generateToken(user.id, user.role), user: safeUser };
  }

  getById(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: SAFE_USER_SELECT });
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE_USER_SELECT });
  }

  private generateToken(userId: string, role: string): string {
    return this.jwtService.sign({ sub: userId, role });
  }
}
