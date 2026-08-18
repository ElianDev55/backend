import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill } from '../bills/entities/bill.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Delivery } from './entities/delivery.entity';
import { DeliveryStatus } from './deliveries.types';
import { DeliveriesService } from './deliveries.service';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let repository: jest.Mocked<Repository<Delivery>>;
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

  const mockDelivery: Delivery = {
    addressLine: 'Calle 1',
    bill: mockBill,
    city: 'Bogota',
    country: 'CO',
    createdAt: new Date(),
    id: 'delivery-id',
    postalCode: '110111',
    recipientName: 'Test Customer',
    state: 'Cundinamarca',
    status: DeliveryStatus.PENDING,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Delivery>>;

    billsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Bill>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: getRepositoryToken(Delivery), useValue: repository },
        { provide: getRepositoryToken(Bill), useValue: billsRepository },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all deliveries with bills', async () => {
      repository.find.mockResolvedValue([mockDelivery]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: { bill: true },
      });
      expect(result).toEqual([mockDelivery]);
    });
  });

  describe('findOne', () => {
    it('should return a delivery by id', async () => {
      repository.findOne.mockResolvedValue(mockDelivery);

      const result = await service.findOne('delivery-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        relations: { bill: true },
        where: { id: 'delivery-id' },
      });
      expect(result).toEqual(mockDelivery);
    });

    it('should throw NotFoundException when delivery does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateDeliveryDto = {
      addressLine: 'Calle 1',
      billId: 'bill-id',
      city: 'Bogota',
      country: 'co',
      postalCode: '110111',
      recipientName: 'Test Customer',
      state: 'Cundinamarca',
      status: DeliveryStatus.PENDING,
    };

    it('should create a delivery and uppercase country', async () => {
      billsRepository.findOne.mockResolvedValue(mockBill);
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDelivery);
      repository.create.mockReturnValue(mockDelivery);
      repository.save.mockResolvedValue(mockDelivery);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'CO' }),
      );
      expect(result.country).toBe('CO');
    });

    it('should throw NotFoundException when bill does not exist', async () => {
      billsRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when bill already has a delivery', async () => {
      billsRepository.findOne.mockResolvedValue(mockBill);
      repository.findOne.mockResolvedValue(mockDelivery);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update a delivery', async () => {
      repository.findOne.mockResolvedValue(mockDelivery);
      repository.save.mockResolvedValue({
        ...mockDelivery,
        city: 'Medellin',
        country: 'CO',
      });

      const updateDto: UpdateDeliveryDto = { city: 'Medellin' };

      const result = await service.update('delivery-id', updateDto);

      expect(result.city).toBe('Medellin');
    });

    it('should throw when delivery does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
