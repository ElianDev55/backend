import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<Repository<Product>>;

  const mockProduct: Product = {
    createdAt: new Date(),
    currency: 'COP',
    deletedAt: null,
    description: 'A test product',
    id: 'product-id-1',
    imageUrl: null,
    isDeleted: false,
    name: 'Test Product',
    priceInCents: 100000,
    reservedQuantity: 0,
    sku: 'SKU-001',
    stockQuantity: 10,
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
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return active products ordered by createdAt DESC', async () => {
      repository.find.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { isDeleted: false },
      });
      expect(result).toEqual([mockProduct]);
    });

    it('should include deleted products when requested', async () => {
      repository.find.mockResolvedValue([mockProduct]);

      await service.findAll(true);

      expect(repository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      repository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-id-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'product-id-1', isDeleted: false },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      currency: 'COP',
      description: 'A test product',
      name: 'Test Product',
      priceInCents: 100000,
      sku: 'SKU-001',
      stockQuantity: 10,
    };

    it('should create a product with defaults', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProduct);
      repository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { sku: 'SKU-001' },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        currency: 'COP',
        imageUrl: null,
        isDeleted: false,
        deletedAt: null,
        reservedQuantity: 0,
      });
      expect(repository.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException when SKU is already in use', async () => {
      repository.findOne.mockResolvedValue(mockProduct);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when reserved quantity exceeds stock', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...createDto, reservedQuantity: 15 }),
      ).rejects.toThrow(/Reserved quantity cannot be greater than stock/);
    });

    it('should wrap unique violation errors as ConflictException', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockRejectedValue(
        new QueryFailedError('', [], { code: '23505' } as never),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = {
      name: 'Updated Product',
      stockQuantity: 20,
    };

    it('should update a product', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.save.mockResolvedValue({ ...mockProduct, ...updateDto });

      const result = await service.update('product-id-1', updateDto);

      expect(result.name).toBe('Updated Product');
      expect(result.stockQuantity).toBe(20);
    });

    it('should prevent SKU change to an existing SKU', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({
          ...mockProduct,
          id: 'another-id',
          sku: 'SKU-002',
        });

      await expect(
        service.update('product-id-1', { sku: 'SKU-002' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw when product does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('missing-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete a product', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.save.mockResolvedValue({
        ...mockProduct,
        isDeleted: true,
        deletedAt: new Date(),
      });

      await service.softDelete('product-id-1');

      expect(repository.save).toHaveBeenCalled();
      expect(mockProduct.isDeleted).toBe(true);
    });

    it('should throw when product does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.softDelete('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
