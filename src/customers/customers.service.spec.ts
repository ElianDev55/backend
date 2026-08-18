import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<Repository<Customer>>;

  const mockCustomer: Customer = {
    createdAt: new Date(),
    deletedAt: null,
    emailNormalized: 'test@example.com',
    fullName: 'Test Customer',
    id: 'customer-id-1',
    isDeleted: false,
    phone: '3001234567',
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get(getRepositoryToken(Customer));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return active customers', async () => {
      repository.find.mockResolvedValue([mockCustomer]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { isDeleted: false },
      });
      expect(result).toEqual([mockCustomer]);
    });

    it('should include deleted customers when requested', async () => {
      repository.find.mockResolvedValue([mockCustomer]);

      await service.findAll(true);

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      repository.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne('customer-id-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'customer-id-1', isDeleted: false },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateCustomerDto = {
      email: '  Test@Example.COM  ',
      fullName: 'Test Customer',
      phone: '3001234567',
    };

    it('should normalize email and create a new customer', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockCustomer);
      repository.save.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { emailNormalized: 'test@example.com' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        emailNormalized: 'test@example.com',
        fullName: 'Test Customer',
        phone: '3001234567',
        isDeleted: false,
        deletedAt: null,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should restore and update a soft-deleted customer with same email', async () => {
      const deletedCustomer: Customer = {
        ...mockCustomer,
        isDeleted: true,
        deletedAt: new Date(),
        fullName: 'Old Name',
        phone: '3000000000',
      };
      repository.findOne.mockResolvedValue(deletedCustomer);
      repository.save.mockResolvedValue({
        ...deletedCustomer,
        fullName: 'Test Customer',
        phone: '3001234567',
        isDeleted: false,
        deletedAt: null,
      });

      const result = await service.create(createDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.isDeleted).toBe(false);
      expect(result.fullName).toBe('Test Customer');
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      repository.findOne.mockResolvedValue(mockCustomer);
      repository.save.mockResolvedValue({
        ...mockCustomer,
        fullName: 'Updated Name',
      });

      const result = await service.update('customer-id-1', {
        fullName: 'Updated Name',
      });

      expect(result.fullName).toBe('Updated Name');
    });

    it('should normalize email and prevent duplicates', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockCustomer)
        .mockResolvedValueOnce({
          ...mockCustomer,
          id: 'another-id',
          emailNormalized: 'other@example.com',
        });

      await expect(
        service.update('customer-id-1', { email: 'Other@Example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw when customer does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { fullName: 'Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a customer', async () => {
      repository.findOne.mockResolvedValue(mockCustomer);
      repository.save.mockResolvedValue({
        ...mockCustomer,
        isDeleted: true,
        deletedAt: new Date(),
      });

      await service.softDelete('customer-id-1');

      expect(repository.save).toHaveBeenCalled();
      expect(mockCustomer.isDeleted).toBe(true);
    });
  });
});
