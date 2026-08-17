import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ProductRepository } from '../../infrastructure/product.repository';
import {
  PRODUCT_PHOTOS_BUCKET,
  SupabaseStorageService,
} from '../../../../shared/storage/supabase-storage.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { SearchProductsQueryDto } from '../dto/search-products-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly storage: SupabaseStorageService,
  ) {}

  async create(sellerId: string, dto: CreateProductDto, files: Express.Multer.File[]) {
    const photoUrls = await Promise.all(
      (files ?? []).map((file) =>
        this.storage.uploadPublicFile(
          PRODUCT_PHOTOS_BUCKET,
          sellerId,
          file.buffer,
          file.mimetype,
          file.originalname,
        ),
      ),
    );

    return this.productRepository.create({
      seller: { connect: { id: sellerId } },
      title: dto.title,
      description: dto.description,
      category: dto.category,
      condition: dto.condition,
      priceAsking: dto.priceAsking,
      city: dto.city,
      acceptedCategories: dto.acceptedCategories ?? [],
      photoUrls,
    });
  }

  search(query: SearchProductsQueryDto) {
    return this.productRepository.search({
      q: query.q,
      category: query.category,
      city: query.city,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  getById(id: string) {
    return this.productRepository.findById(id);
  }

  listMine(sellerId: string) {
    return this.productRepository.findManyBySeller(sellerId);
  }

  async remove(sellerId: string, id: string) {
    const product = await this.productRepository.findById(id);
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Apenas o dono do anúncio pode removê-lo');
    }
    if (product.status !== ProductStatus.DISPONIVEL) {
      throw new ConflictException('Só é possível remover um anúncio disponível');
    }
    return this.productRepository.updateStatus(id, ProductStatus.REMOVIDO);
  }
}
