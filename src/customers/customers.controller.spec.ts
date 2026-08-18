import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: jest.Mocked<CustomersService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CustomersService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  it('should return all customers', async () => {
    const customers = [{ id: '1' }] as never[];
    service.findAll.mockResolvedValue(customers);

    const result = await controller.findAll(false);

    expect(service.findAll).toHaveBeenCalledWith(false);
    expect(result).toBe(customers);
  });

  it('should return a customer', async () => {
    const customer = { id: '1' } as never;
    service.findOne.mockResolvedValue(customer);

    const result = await controller.findOne('1');

    expect(result).toBe(customer);
  });

  it('should create a customer', async () => {
    const dto = { email: 'test@example.com' } as never;
    service.create.mockResolvedValue(dto);

    await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should update a customer', async () => {
    const dto = { fullName: 'Updated' } as never;
    service.update.mockResolvedValue(dto);

    await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('should soft delete a customer', async () => {
    service.softDelete.mockResolvedValue(undefined);

    await controller.softDelete('1');

    expect(service.softDelete).toHaveBeenCalledWith('1');
  });
});
