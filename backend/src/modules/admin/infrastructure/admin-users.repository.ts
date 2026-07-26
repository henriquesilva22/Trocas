import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Nunca devolve passwordHash para fora do domínio de auth.
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  trustScore: true,
  isBanned: true,
  pixKey: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: { role?: UserRole; page: number; pageSize: number }) {
    const { role, page, pageSize } = params;
    const where: Prisma.UserWhereInput = role ? { role } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  findByIdSafe(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: SAFE_USER_SELECT });
  }

  setBanned(id: string, isBanned: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isBanned }, select: SAFE_USER_SELECT });
  }
}
