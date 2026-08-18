import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { BillStatus } from '../bills/bills.types';
import { BillItem } from '../bills/entities/bill-item.entity';
import { Bill } from '../bills/entities/bill.entity';
import { Customer } from '../customers/entities/customer.entity';
import { DeliveryStatus } from '../deliveries/deliveries.types';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Product } from '../products/entities/product.entity';
import { TransactionStatus } from '../transactions/transactions.types';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ChargeCheckoutDto } from './dto/charge-checkout.dto';
import { PrepareCheckoutDto } from './dto/prepare-checkout.dto';
import { WompiApiError, WompiConfigurationError } from './wompi.client';
import { CheckoutResponse } from './checkout.types';
import { fromPromise } from '../shared/result';
import type {
  PaymentChargeResult,
  PaymentProviderPort,
} from './ports/payment-provider.port';
import { PAYMENT_PROVIDER } from './ports/payment-provider.port';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly processingTransactions = new Set<string>();

  constructor(
    @InjectRepository(Bill)
    private readonly billsRepository: Repository<Bill>,
    @InjectRepository(BillItem)
    private readonly billItemsRepository: Repository<BillItem>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Delivery)
    private readonly deliveriesRepository: Repository<Delivery>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async prepare(
    prepareCheckoutDto: PrepareCheckoutDto,
  ): Promise<CheckoutResponse> {
    try {
      const existingTransaction = await this.transactionsRepository.findOne({
        where: { idempotencyKey: prepareCheckoutDto.idempotencyKey },
        relations: { bill: true },
      });

      if (existingTransaction?.bill) {
        return this.toResponse(existingTransaction, existingTransaction.bill);
      }

      const transactionId = await this.dataSource.transaction(
        async (manager) => {
          const product = await manager.findOne(Product, {
            where: { id: prepareCheckoutDto.productId, isDeleted: false },
            lock: { mode: 'pessimistic_write' },
          });

          if (!product) {
            throw new NotFoundException(
              `Product ${prepareCheckoutDto.productId} not found.`,
            );
          }

          const availableQuantity =
            product.stockQuantity - product.reservedQuantity;
          if (availableQuantity < prepareCheckoutDto.quantity) {
            throw new ConflictException(
              `Only ${availableQuantity} unit(s) are available for product ${product.id}.`,
            );
          }

          const customer = await this.findOrCreateCustomer(
            manager,
            prepareCheckoutDto.customer,
          );
          const baseFeeInCents = prepareCheckoutDto.baseFeeInCents ?? 0;
          const deliveryFeeInCents = prepareCheckoutDto.deliveryFeeInCents ?? 0;
          const lineTotalInCents =
            product.priceInCents * prepareCheckoutDto.quantity;
          const bill = manager.create(Bill, {
            number: this.generateBillNumber(),
            customer,
            status: BillStatus.PENDING,
            subtotalInCents: lineTotalInCents,
            baseFeeInCents,
            deliveryFeeInCents,
            totalInCents:
              lineTotalInCents + baseFeeInCents + deliveryFeeInCents,
            currency: prepareCheckoutDto.currency ?? 'COP',
          });
          const savedBill = await manager.save(bill);
          const billItem = manager.create(BillItem, {
            bill: savedBill,
            product,
            productNameSnapshot: product.name,
            skuSnapshot: product.sku,
            unitPriceInCents: product.priceInCents,
            quantity: prepareCheckoutDto.quantity,
            lineTotalInCents,
          });
          await manager.save(BillItem, billItem);

          const delivery = manager.create(Delivery, {
            bill: savedBill,
            status: DeliveryStatus.PENDING,
            recipientName: prepareCheckoutDto.delivery.recipientName,
            addressLine: prepareCheckoutDto.delivery.addressLine,
            city: prepareCheckoutDto.delivery.city,
            state: prepareCheckoutDto.delivery.state,
            postalCode: prepareCheckoutDto.delivery.postalCode,
            country: prepareCheckoutDto.delivery.country.toUpperCase(),
          });
          await manager.save(Delivery, delivery);

          const requestHash = createHash('sha256')
            .update(
              JSON.stringify({
                customer: prepareCheckoutDto.customer,
                delivery: prepareCheckoutDto.delivery,
                fees: { baseFeeInCents, deliveryFeeInCents },
                productId: prepareCheckoutDto.productId,
                quantity: prepareCheckoutDto.quantity,
              }),
            )
            .digest('hex');
          const transaction = manager.create(Transaction, {
            bill: savedBill,
            attemptNumber: 1,
            status: TransactionStatus.PENDING,
            provider: 'wompi',
            providerReference: null,
            idempotencyKey: prepareCheckoutDto.idempotencyKey,
            requestHash,
            cardBrand: null,
            lastFour: null,
            failureCode: null,
          });
          const savedTransaction = await manager.save(transaction);

          product.reservedQuantity += prepareCheckoutDto.quantity;
          await manager.save(product);

          return savedTransaction.id;
        },
      );

      return await this.getStatus(transactionId);
    } catch (error) {
      throw this.handleDatabaseError(error, 'prepare checkout');
    }
  }

  async charge(
    transactionId: string,
    chargeCheckoutDto: ChargeCheckoutDto,
  ): Promise<CheckoutResponse> {
    const transaction = await this.findTransaction(transactionId);

    if (transaction.status !== TransactionStatus.PENDING) {
      return this.getStatus(transactionId);
    }

    if (this.processingTransactions.has(transactionId)) {
      throw new ConflictException('This checkout is already being processed.');
    }

    this.processingTransactions.add(transactionId);

    try {
      let providerResult: PaymentChargeResult;
      const providerOutcome = await fromPromise<PaymentChargeResult>(() => {
        if (transaction.providerReference) {
          return this.paymentProvider.pollTransaction(
            transaction.providerReference,
          );
        }
        return this.getBillForTransaction(transaction).then((bill) =>
          this.paymentProvider.charge({
            amountInCents: bill.totalInCents,
            currency: bill.currency,
            customerEmail: bill.customer.emailNormalized,
            installments: chargeCheckoutDto.installments,
            paymentToken: chargeCheckoutDto.paymentToken,
            reference: bill.number,
          }),
        );
      });

      if (providerOutcome.ok) {
        providerResult = providerOutcome.value;
      } else {
        if (providerOutcome.error instanceof WompiConfigurationError) {
          throw new ServiceUnavailableException(providerOutcome.error.message);
        }
        providerResult = this.mapProviderError(providerOutcome.error);
      }

      return await this.finalizeTransaction(transactionId, providerResult);
    } finally {
      this.processingTransactions.delete(transactionId);
    }
  }

  async getStatus(transactionId: string): Promise<CheckoutResponse> {
    const transaction = await this.findTransaction(transactionId);
    const bill = await this.getBillForTransaction(transaction);
    return this.toResponse(transaction, bill);
  }

  private async finalizeTransaction(
    transactionId: string,
    providerResult: PaymentChargeResult,
  ): Promise<CheckoutResponse> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const transaction = await manager.findOne(Transaction, {
          where: { id: transactionId },
          relations: { bill: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!transaction) {
          throw new NotFoundException(
            `Transaction ${transactionId} not found.`,
          );
        }

        if (transaction.status !== TransactionStatus.PENDING) {
          return;
        }

        const bill = await manager.findOne(Bill, {
          where: { id: transaction.bill.id },
          relations: { delivery: true, items: { product: true } },
        });

        if (!bill) {
          throw new NotFoundException(`Bill ${transaction.bill.id} not found.`);
        }

        transaction.status = providerResult.status;
        transaction.providerReference =
          providerResult.providerReference ?? transaction.providerReference;
        transaction.cardBrand =
          providerResult.cardBrand ?? transaction.cardBrand;
        transaction.lastFour = providerResult.lastFour ?? transaction.lastFour;
        transaction.failureCode = providerResult.failureCode;

        if (providerResult.status === TransactionStatus.APPROVED) {
          for (const billItem of bill.items) {
            const product = await manager.findOne(Product, {
              where: { id: billItem.product.id, isDeleted: false },
              lock: { mode: 'pessimistic_write' },
            });

            if (!product || product.stockQuantity < billItem.quantity) {
              throw new ConflictException(
                `Stock is no longer available for product ${billItem.product.id}.`,
              );
            }

            product.stockQuantity -= billItem.quantity;
            product.reservedQuantity = Math.max(
              0,
              product.reservedQuantity - billItem.quantity,
            );
            await manager.save(product);
          }

          bill.status = BillStatus.PAID;
        } else if (providerResult.status === TransactionStatus.DECLINED) {
          await this.releaseReservedStock(manager, bill);
          bill.status = BillStatus.PAYMENT_FAILED;
          if (bill.delivery) {
            bill.delivery.status = DeliveryStatus.CANCELLED;
            await manager.save(bill.delivery);
          }
        }

        await manager.save(transaction);
        await manager.save(bill);
      });

      return await this.getStatus(transactionId);
    } catch (error) {
      throw this.handleDatabaseError(
        error,
        `finalize transaction ${transactionId}`,
      );
    }
  }

  private async releaseReservedStock(
    manager: EntityManager,
    bill: Bill,
  ): Promise<void> {
    for (const billItem of bill.items) {
      const product = await manager.findOne(Product, {
        where: { id: billItem.product.id, isDeleted: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(
          `Product ${billItem.product.id} not found.`,
        );
      }

      product.reservedQuantity = Math.max(
        0,
        product.reservedQuantity - billItem.quantity,
      );
      await manager.save(product);
    }
  }

  private async findOrCreateCustomer(
    manager: EntityManager,
    customerData: PrepareCheckoutDto['customer'],
  ): Promise<Customer> {
    const emailNormalized = customerData.email.trim().toLowerCase();
    const existingCustomer = await manager.findOne(Customer, {
      where: { emailNormalized },
    });

    if (existingCustomer) {
      existingCustomer.fullName = customerData.fullName;
      existingCustomer.phone = customerData.phone;
      existingCustomer.isDeleted = false;
      existingCustomer.deletedAt = null;
      return manager.save(existingCustomer);
    }

    return manager.save(
      manager.create(Customer, {
        emailNormalized,
        fullName: customerData.fullName,
        phone: customerData.phone,
        isDeleted: false,
        deletedAt: null,
      }),
    );
  }

  private async findTransaction(transactionId: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionsRepository.findOne({
        where: { id: transactionId },
        relations: { bill: true },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found.`);
      }

      return transaction;
    } catch (error) {
      throw this.handleDatabaseError(
        error,
        `find transaction ${transactionId}`,
      );
    }
  }

  private async getBillForTransaction(transaction: Transaction): Promise<Bill> {
    const bill = await this.billsRepository.findOne({
      where: { id: transaction.bill.id },
      relations: { customer: true, items: { product: true }, delivery: true },
    });

    if (!bill) {
      throw new NotFoundException(`Bill ${transaction.bill.id} not found.`);
    }

    return bill;
  }

  private mapProviderError(error: unknown): PaymentChargeResult {
    if (
      error instanceof WompiApiError &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return {
        cardBrand: null,
        failureCode: `WOMPI_${error.statusCode}`,
        lastFour: null,
        providerReference: null,
        status: TransactionStatus.DECLINED,
      };
    }

    this.logger.warn('Payment provider did not return a final result.');
    return {
      cardBrand: null,
      failureCode: 'WOMPI_UNAVAILABLE',
      lastFour: null,
      providerReference: null,
      status: TransactionStatus.UNKNOWN,
    };
  }

  private toResponse(transaction: Transaction, bill: Bill): CheckoutResponse {
    return {
      amountInCents: bill.totalInCents,
      billId: bill.id,
      billNumber: bill.number,
      currency: bill.currency,
      providerReference: transaction.providerReference,
      status: transaction.status,
      transactionId: transaction.id,
      transactionNumber: transaction.id,
    };
  }

  private generateBillNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = randomBytes(3).toString('hex').toUpperCase();
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
      return new ConflictException('Checkout idempotency key already exists.');
    }

    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Unable to ${operation}: ${message}`);
    return new InternalServerErrorException(`Unable to ${operation}.`);
  }
}
