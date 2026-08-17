import { Injectable } from '@nestjs/common';
import { Prisma, ProductCategory, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface SearchProductsParams {
  q?: string;
  category?: ProductCategory;
  city?: string;
  page: number;
  pageSize: number;
}

// Nunca `include: { seller: true }` — isso devolveria passwordHash (e outros
// dados sensíveis) do vendedor em rotas PÚBLICAS de catálogo.
const SAFE_SELLER_SELECT = {
  id: true,
  name: true,
  trustScore: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  findById(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { seller: { select: SAFE_SELLER_SELECT } },
    });
  }

  async search(params: SearchProductsParams) {
    const { q, category, city, page, pageSize } = params;
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.DISPONIVEL,
      ...(category ? { category } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { seller: { select: SAFE_SELLER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  findManyBySeller(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: ProductStatus) {
    return this.prisma.product.update({ where: { id }, data: { status } });
  }

  updateStatusInTx(tx: Prisma.TransactionClient, id: string, status: ProductStatus) {
    return tx.product.update({ where: { id }, data: { status } });
  }
}
