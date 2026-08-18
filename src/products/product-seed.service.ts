import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { productSeedData } from './data/product-seed.data';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductSeedService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const productCount = await this.productsRepository.count();

      if (productCount > 0) {
        this.logger.log(
          `Product seed skipped: ${productCount} product(s) already exist.`,
        );
        return;
      }

      await this.productsRepository.insert(productSeedData);
      this.logger.log(
        `Product seed completed: ${productSeedData.length} product(s) inserted.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(`Unable to seed products: ${message}`);
      throw error;
    }
  }
}
