import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class HubsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.hub.findMany({ where: { isActive: true }, orderBy: { city: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.hub.findUniqueOrThrow({ where: { id } });
  }

  create(data: Prisma.HubCreateInput) {
    return this.prisma.hub.create({ data });
  }

  update(id: string, data: Prisma.HubUpdateInput) {
    return this.prisma.hub.update({ where: { id }, data });
  }

  deactivate(id: string) {
    return this.prisma.hub.update({ where: { id }, data: { isActive: false } });
  }
}
