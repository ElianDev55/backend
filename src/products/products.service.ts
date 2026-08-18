import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll(includeDeleted = false): Promise<Product[]> {
    try {
      return await this.productsRepository.find({
        where: includeDeleted ? undefined : { isDeleted: false },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleDatabaseError(error, 'list products');
    }
  }

  async findOne(id: string): Promise<Product> {
    try {
      const product = await this.productsRepository.findOne({
        where: { id, isDeleted: false },
      });

      if (!product) {
        throw new NotFoundException(`Product ${id} not found.`);
      }

      return product;
    } catch (error) {
      throw this.handleDatabaseError(error, `find product ${id}`);
    }
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      await this.ensureSkuIsAvailable(createProductDto.sku);
      const reservedQuantity = createProductDto.reservedQuantity ?? 0;

      this.ensureReservationWithinStock(
        createProductDto.stockQuantity,
        reservedQuantity,
      );

      const product = this.productsRepository.create({
        ...createProductDto,
        currency: createProductDto.currency ?? 'COP',
        imageUrl: createProductDto.imageUrl ?? null,
        reservedQuantity,
        isDeleted: false,
        deletedAt: null,
      });

      return await this.productsRepository.save(product);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create product');
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    try {
      const product = await this.findOne(id);

      if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
        await this.ensureSkuIsAvailable(updateProductDto.sku, id);
      }

      const stockQuantity =
        updateProductDto.stockQuantity ?? product.stockQuantity;
      const reservedQuantity =
        updateProductDto.reservedQuantity ?? product.reservedQuantity;
      this.ensureReservationWithinStock(stockQuantity, reservedQuantity);

      Object.assign(product, updateProductDto, {
        imageUrl: updateProductDto.imageUrl ?? product.imageUrl,
        currency: updateProductDto.currency ?? product.currency,
        reservedQuantity,
      });

      return await this.productsRepository.save(product);
    } catch (error) {
      throw this.handleDatabaseError(error, `update product ${id}`);
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      const product = await this.findOne(id);
      product.isDeleted = true;
      product.deletedAt = new Date();
      await this.productsRepository.save(product);
    } catch (error) {
      throw this.handleDatabaseError(error, `delete product ${id}`);
    }
  }

  private async ensureSkuIsAvailable(
    sku: string,
    excludedId?: string,
  ): Promise<void> {
    const existingProduct = await this.productsRepository.findOne({
      where: { sku },
    });

    if (existingProduct && existingProduct.id !== excludedId) {
      throw new ConflictException(`SKU ${sku} is already in use.`);
    }
  }

  private ensureReservationWithinStock(
    stockQuantity: number,
    reservedQuantity: number,
  ): void {
    if (reservedQuantity > stockQuantity) {
      throw new BadRequestException(
        'Reserved quantity cannot be greater than stock quantity.',
      );
    }
  }

  private handleDatabaseError(
    error: unknown,
    operation: string,
  ): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    ) {
      return new ConflictException(
        'A product with the same unique value already exists.',
      );
    }

    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Unable to ${operation}: ${message}`);
    return new InternalServerErrorException(`Unable to ${operation}.`);
  }
}
