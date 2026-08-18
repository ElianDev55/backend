import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should return all products', async () => {
    const products = [{ id: '1', name: 'Product' }] as never[];
    service.findAll.mockResolvedValue(products);

    const result = await controller.findAll(false);

    expect(service.findAll).toHaveBeenCalledWith(false);
    expect(result).toBe(products);
  });

  it('should return a single product', async () => {
    const product = { id: '1', name: 'Product' } as never;
    service.findOne.mockResolvedValue(product);

    const result = await controller.findOne('1');

    expect(service.findOne).toHaveBeenCalledWith('1');
    expect(result).toBe(product);
  });

  it('should create a product', async () => {
    const dto = { name: 'New Product' } as never;
    const product = { id: '1', ...dto } as never;
    service.create.mockResolvedValue(product);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(product);
  });

  it('should update a product', async () => {
    const dto = { name: 'Updated' } as never;
    const product = { id: '1', ...dto } as never;
    service.update.mockResolvedValue(product);

    const result = await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
    expect(result).toBe(product);
  });

  it('should soft delete a product', async () => {
    service.softDelete.mockResolvedValue(undefined);

    await controller.softDelete('1');

    expect(service.softDelete).toHaveBeenCalledWith('1');
  });
});
