import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from '../application/services/products.service';
import { CreateProductDto } from '../application/dto/create-product.dto';
import { SearchProductsQueryDto } from '../application/dto/search-products-query.dto';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';

const MAX_PHOTOS = 8;

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  search(@Query() query: SearchProductsQueryDto) {
    return this.productsService.search(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.productsService.listMine(user.id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('photos', MAX_PHOTOS, { storage: memoryStorage() }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.create(user.id, dto, files);
  }

  @Patch(':id/remove')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.remove(user.id, id);
  }
}
