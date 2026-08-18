import { Test, TestingModule } from '@nestjs/testing';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

describe('BillsController', () => {
  let controller: BillsController;
  let service: jest.Mocked<BillsService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<BillsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillsController],
      providers: [{ provide: BillsService, useValue: service }],
    }).compile();

    controller = module.get<BillsController>(BillsController);
  });

  it('should return all bills', async () => {
    const bills = [{ id: '1' }] as never[];
    service.findAll.mockResolvedValue(bills);

    const result = await controller.findAll();

    expect(result).toBe(bills);
  });

  it('should return a bill', async () => {
    const bill = { id: '1' } as never;
    service.findOne.mockResolvedValue(bill);

    const result = await controller.findOne('1');

    expect(result).toBe(bill);
  });

  it('should create a bill', async () => {
    const dto = { customerId: '1', items: [] } as never;
    service.create.mockResolvedValue(dto);

    await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should update a bill', async () => {
    const dto = { status: 'PAID' } as never;
    service.update.mockResolvedValue(dto);

    await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
  });
});
