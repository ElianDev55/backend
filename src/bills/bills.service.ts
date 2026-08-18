import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { BillStatus } from './bills.types';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillItem } from './entities/bill-item.entity';
import { Bill } from './entities/bill.entity';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    @InjectRepository(Bill)
    private readonly billsRepository: Repository<Bill>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Bill[]> {
    try {
      return await this.billsRepository.find({
        relations: { customer: true, items: { product: true } },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleDatabaseError(error, 'list bills');
    }
  }

  async findOne(id: string): Promise<Bill> {
    try {
      const bill = await this.billsRepository.findOne({
        where: { id },
        relations: { customer: true, items: { product: true } },
      });

      if (!bill) {
        throw new NotFoundException(`Bill ${id} not found.`);
      }

      return bill;
    } catch (error) {
      throw this.handleDatabaseError(error, `find bill ${id}`);
    }
  }

  async create(createBillDto: CreateBillDto): Promise<Bill> {
    try {
      const billId = await this.dataSource.transaction(async (manager) => {
        const customer = await manager.findOne(Customer, {
          where: { id: createBillDto.customerId, isDeleted: false },
        });

        if (!customer) {
          throw new NotFoundException(
            `Customer ${createBillDto.customerId} not found.`,
          );
        }

        const products = await Promise.all(
          createBillDto.items.map(({ productId }) =>
            manager.findOne(Product, {
              where: { id: productId, isDeleted: false },
            }),
          ),
        );

        const productById = new Map(
          products
            .filter((product): product is Product => product !== null)
            .map((product) => [product.id, product]),
        );

        for (const item of createBillDto.items) {
          if (!productById.has(item.productId)) {
            throw new NotFoundException(`Product ${item.productId} not found.`);
          }
        }

        const itemData = createBillDto.items.map((item) => {
          const product = productById.get(item.productId);
          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found.`);
          }

          const lineTotalInCents = product.priceInCents * item.quantity;
          return {
            product,
            productNameSnapshot: product.name,
            skuSnapshot: product.sku,
            unitPriceInCents: product.priceInCents,
            quantity: item.quantity,
            lineTotalInCents,
          };
        });

        const subtotalInCents = itemData.reduce(
          (subtotal, item) => subtotal + item.lineTotalInCents,
          0,
        );
        const baseFeeInCents = createBillDto.baseFeeInCents ?? 0;
        const deliveryFeeInCents = createBillDto.deliveryFeeInCents ?? 0;
        const bill = manager.create(Bill, {
          number: createBillDto.number ?? this.generateBillNumber(),
          customer,
          status: createBillDto.status ?? BillStatus.PENDING,
          subtotalInCents,
          baseFeeInCents,
          deliveryFeeInCents,
          totalInCents: subtotalInCents + baseFeeInCents + deliveryFeeInCents,
          currency: createBillDto.currency ?? 'COP',
        });
        const savedBill = await manager.save(bill);
        const billItems = itemData.map((item) =>
          manager.create(BillItem, { ...item, bill: savedBill }),
        );
        await manager.save(BillItem, billItems);

        return savedBill.id;
      });

      return await this.findOne(billId);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create bill');
    }
  }

  async update(id: string, updateBillDto: UpdateBillDto): Promise<Bill> {
    try {
      const bill = await this.findOne(id);
      const baseFeeInCents =
        updateBillDto.baseFeeInCents ?? bill.baseFeeInCents;
      const deliveryFeeInCents =
        updateBillDto.deliveryFeeInCents ?? bill.deliveryFeeInCents;

      Object.assign(bill, {
        status: updateBillDto.status ?? bill.status,
        baseFeeInCents,
        deliveryFeeInCents,
        totalInCents:
          bill.subtotalInCents + baseFeeInCents + deliveryFeeInCents,
        currency: updateBillDto.currency ?? bill.currency,
      });

      await this.billsRepository.save(bill);
      return await this.findOne(id);
    } catch (error) {
      throw this.handleDatabaseError(error, `update bill ${id}`);
    }
  }

  private generateBillNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `BILL-${timestamp}-${suffix}`;
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
        'A bill with the same unique value already exists.',
      );
    }

    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Unable to ${operation}: ${message}`);
    return new InternalServerErrorException(`Unable to ${operation}.`);
  }
}
