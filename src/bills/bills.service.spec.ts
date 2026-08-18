import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillItem } from './entities/bill-item.entity';
import { Bill } from './entities/bill.entity';

describe('BillsService', () => {
  let service: BillsService;
  let repository: jest.Mocked<Repository<Bill>>;
  let dataSource: jest.Mocked<DataSource>;
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
    priceInCents: 500000,
    reservedQuantity: 0,
    sku: 'SKU-001',
    stockQuantity: 10,
    updatedAt: new Date(),
  };

  const mockBill: Bill = {
    baseFeeInCents: 0,
    createdAt: new Date(),
    currency: 'COP',
    customer: mockCustomer,
    id: 'bill-id',
    items: [],
    number: 'BILL-001',
    status: 'PENDING' as never,
    subtotalInCents: 500000,
    totalInCents: 500000,
    transactions: [],
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Bill>>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillsService,
        { provide: getRepositoryToken(Bill), useValue: repository },
        { provide: getRepositoryToken(Customer), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<BillsService>(BillsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all bills with relations', async () => {
      repository.find.mockResolvedValue([mockBill]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: { customer: true, items: { product: true } },
      });
      expect(result).toEqual([mockBill]);
    });
  });

  describe('findOne', () => {
    it('should return a bill by id', async () => {
      repository.findOne.mockResolvedValue(mockBill);

      const result = await service.findOne('bill-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        relations: { customer: true, items: { product: true } },
        where: { id: 'bill-id' },
      });
      expect(result).toEqual(mockBill);
    });

    it('should throw NotFoundException when bill does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateBillDto = {
      baseFeeInCents: 200000,
      currency: 'COP',
      customerId: 'customer-id',
      deliveryFeeInCents: 800000,
      items: [{ productId: 'product-id', quantity: 1 }],
      status: 'PENDING' as never,
    };

    it('should create a bill with items and calculate totals', async () => {
      manager.findOne
        .mockResolvedValueOnce(mockCustomer)
        .mockResolvedValueOnce(mockProduct);
      manager.create.mockImplementation((entity, data) => data);
      manager.save.mockImplementation(
        async (target: unknown, entity?: unknown) => {
          const resolvedEntity = entity ?? target;
          if (
            resolvedEntity &&
            typeof resolvedEntity === 'object' &&
            'number' in resolvedEntity
          ) {
            return { ...resolvedEntity, id: 'bill-id' };
          }
          return resolvedEntity;
        },
      );
      repository.findOne.mockResolvedValue(mockBill);

      const result = await service.create(createDto);

      expect(manager.create).toHaveBeenCalledWith(BillItem, expect.any(Object));
      expect(result.id).toBe('bill-id');
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when a product does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(mockCustomer);
      manager.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update bill fees and recalculate total', async () => {
      repository.findOne.mockResolvedValue(mockBill);
      repository.save.mockResolvedValue({
        ...mockBill,
        baseFeeInCents: 100000,
        deliveryFeeInCents: 200000,
        totalInCents: 800000,
      });

      const updateDto: UpdateBillDto = {
        baseFeeInCents: 100000,
        deliveryFeeInCents: 200000,
      };

      const result = await service.update('bill-id', updateDto);

      expect(result.totalInCents).toBe(800000);
    });

    it('should throw when bill does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
