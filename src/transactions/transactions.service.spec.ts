import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill } from '../bills/entities/bill.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { TransactionStatus } from './transactions.types';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: jest.Mocked<Repository<Transaction>>;
  let billsRepository: jest.Mocked<Repository<Bill>>;

  const mockBill: Bill = {
    baseFeeInCents: 0,
    createdAt: new Date(),
    currency: 'COP',
    customer: {} as Bill['customer'],
    id: 'bill-id',
    items: [],
    number: 'BILL-001',
    status: 'PENDING' as never,
    subtotalInCents: 100000,
    totalInCents: 100000,
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
    idempotencyKey: 'idem-key',
    lastFour: null,
    provider: 'wompi',
    providerReference: null,
    requestHash: 'hash',
    status: TransactionStatus.PENDING,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    billsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Bill>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: repository },
        { provide: getRepositoryToken(Bill), useValue: billsRepository },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all transactions with bills', async () => {
      repository.find.mockResolvedValue([mockTransaction]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: { bill: true },
      });
      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      repository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findOne('transaction-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        relations: { bill: true },
        where: { id: 'transaction-id' },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateTransactionDto = {
      attemptNumber: 1,
      billId: 'bill-id',
      idempotencyKey: 'idem-key',
      provider: 'wompi',
      requestHash: 'hash',
      status: TransactionStatus.PENDING,
    };

    it('should return existing transaction for same idempotency key', async () => {
      repository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTransaction);
    });

    it('should throw ConflictException when idempotency key has different hash', async () => {
      repository.findOne.mockResolvedValue({
        ...mockTransaction,
        requestHash: 'different-hash',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a new transaction with incremented attempt number', async () => {
      repository.findOne.mockResolvedValue(null).mockResolvedValueOnce(null);
      billsRepository.findOne.mockResolvedValue(mockBill);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockTransaction);
      repository.save.mockResolvedValue(mockTransaction);
      repository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.create(createDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when bill does not exist', async () => {
      repository.findOne.mockResolvedValue(null);
      billsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      repository.findOne.mockResolvedValue(mockTransaction);
      repository.save.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.APPROVED,
      });

      const updateDto: UpdateTransactionDto = {
        status: TransactionStatus.APPROVED,
      };

      const result = await service.update('transaction-id', updateDto);

      expect(result.status).toBe(TransactionStatus.APPROVED);
    });

    it('should throw when transaction does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { status: TransactionStatus.APPROVED }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
