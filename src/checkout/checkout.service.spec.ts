import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BillItem } from '../bills/entities/bill-item.entity';
import { Bill } from '../bills/entities/bill.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Product } from '../products/entities/product.entity';
import { TransactionStatus } from '../transactions/transactions.types';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ChargeCheckoutDto } from './dto/charge-checkout.dto';
import { PrepareCheckoutDto } from './dto/prepare-checkout.dto';
import { CheckoutService } from './checkout.service';
import { WompiClient, WompiConfigurationError } from './wompi.client';
import { PAYMENT_PROVIDER } from './ports/payment-provider.port';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let dataSource: jest.Mocked<DataSource>;
  let transactionsRepository: jest.Mocked<Repository<Transaction>>;
  let billsRepository: jest.Mocked<Repository<Bill>>;
  let wompiClient: jest.Mocked<WompiClient>;
  let manager: jest.Mocked<EntityManager>;

  const mockCustomer: Customer = {
    createdAt: new Date(),
    deletedAt: null,
    emailNormalized: 'test@example.com',
    fullName: 'Test Customer',
    id: 'customer-id',
    isDeleted: false,
    phone: '3001234567',
    updatedAt: new Date(),
  };

  const mockProduct: Product = {
    createdAt: new Date(),
    currency: 'COP',
    deletedAt: null,
    description: 'Product',
    id: 'product-id',
    imageUrl: null,
    isDeleted: false,
    name: 'Test Product',
    priceInCents: 1000000,
    reservedQuantity: 0,
    sku: 'SKU-001',
    stockQuantity: 10,
    updatedAt: new Date(),
  };

  const mockBill: Bill = {
    baseFeeInCents: 200000,
    createdAt: new Date(),
    currency: 'COP',
    customer: mockCustomer,
    delivery: undefined,
    deliveryFeeInCents: 800000,
    id: 'bill-id',
    items: [],
    number: 'BILL-TEST-001',
    status: 'PENDING' as never,
    subtotalInCents: 1000000,
    totalInCents: 2000000,
    transactions: [],
    updatedAt: new Date(),
  };

  const mockTransaction: Transaction = {
    attemptNumber: 1,
    bill: mockBill,
    cardBrand: null,
    createdAt: new Date(),
    failureCode: null,
    id: 'transaction-id',
    idempotencyKey: 'idem-key-1',
    lastFour: null,
    provider: 'wompi',
    providerReference: null,
    requestHash: 'hash',
    status: TransactionStatus.PENDING,
    updatedAt: new Date(),
  };

  const prepareDto: PrepareCheckoutDto = {
    baseFeeInCents: 200000,
    currency: 'COP',
    customer: {
      email: 'test@example.com',
      fullName: 'Test Customer',
      phone: '3001234567',
    },
    delivery: {
      addressLine: 'Calle 1',
      city: 'Bogota',
      country: 'CO',
      postalCode: '110111',
      recipientName: 'Test Customer',
      state: 'Cundinamarca',
    },
    deliveryFeeInCents: 800000,
    idempotencyKey: 'idem-key-1',
    productId: 'product-id',
    quantity: 1,
  };

  beforeEach(async () => {
    manager = {
      create: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      transaction: jest.fn(async (callback) =>
        callback(manager as EntityManager),
      ),
    } as unknown as jest.Mocked<DataSource>;

    transactionsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    billsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Bill>>;

    wompiClient = {
      charge: jest.fn(),
      pollTransaction: jest.fn(),
    } as unknown as jest.Mocked<WompiClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Bill), useValue: billsRepository },
        { provide: getRepositoryToken(BillItem), useValue: {} },
        { provide: getRepositoryToken(Customer), useValue: {} },
        { provide: getRepositoryToken(Delivery), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionsRepository,
        },
        { provide: PAYMENT_PROVIDER, useValue: wompiClient },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);

    manager.create.mockImplementation((entity, data) => data);
    manager.save.mockImplementation((target: unknown, entity?: unknown) => {
      const resolved = (entity ?? target) as Record<string, unknown>;
      if ('idempotencyKey' in resolved) {
        return { ...resolved, id: 'transaction-id' } as never;
      }
      if ('number' in resolved) {
        return { ...resolved, id: 'bill-id' } as never;
      }
      return resolved as never;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('prepare', () => {
    it('should return existing transaction when idempotency key is reused', async () => {
      transactionsRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.prepare(prepareDto);

      expect(transactionsRepository.findOne).toHaveBeenCalledWith({
        relations: { bill: true },
        where: { idempotencyKey: 'idem-key-1' },
      });
      expect(result.transactionId).toBe('transaction-id');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      transactionsRepository.findOne.mockResolvedValue(null);
      manager.findOne.mockResolvedValue(null);

      await expect(service.prepare(prepareDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when stock is insufficient', async () => {
      transactionsRepository.findOne.mockResolvedValue(null);
      manager.findOne.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 1,
        reservedQuantity: 1,
      });

      await expect(service.prepare(prepareDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create pending transaction, bill, delivery and reserve stock', async () => {
      transactionsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTransaction);
      manager.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockCustomer);
      billsRepository.findOne.mockResolvedValue(mockBill);

      const result = await service.prepare(prepareDto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result.transactionId).toBe('transaction-id');
      expect(result.status).toBe(TransactionStatus.PENDING);
    });
  });

  describe('charge', () => {
    const chargeDto: ChargeCheckoutDto = {
      installments: 1,
      paymentToken: 'tok_test',
      personalDataAccepted: true,
      termsAccepted: true,
    };

    it('should return current status when transaction is not PENDING', async () => {
      transactionsRepository.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.APPROVED,
      });
      billsRepository.findOne.mockResolvedValue(mockBill);

      const result = await service.charge('transaction-id', chargeDto);

      expect(wompiClient.charge).not.toHaveBeenCalled();
      expect(result.status).toBe(TransactionStatus.APPROVED);
    });

    it('should map WompiConfigurationError to ServiceUnavailableException', async () => {
      transactionsRepository.findOne.mockResolvedValue(mockTransaction);
      billsRepository.findOne.mockResolvedValue(mockBill);
      wompiClient.charge.mockRejectedValue(
        new WompiConfigurationError('Missing keys'),
      );

      await expect(service.charge('transaction-id', chargeDto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getStatus', () => {
    it('should return transaction status', async () => {
      transactionsRepository.findOne.mockResolvedValueOnce(mockTransaction);
      billsRepository.findOne.mockResolvedValueOnce(mockBill);

      const result = await service.getStatus('transaction-id');

      expect(result.transactionId).toBe('transaction-id');
      expect(result.status).toBe(TransactionStatus.PENDING);
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      transactionsRepository.findOne.mockResolvedValue(null);

      await expect(service.getStatus('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
