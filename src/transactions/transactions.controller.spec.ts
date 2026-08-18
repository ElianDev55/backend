import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: jest.Mocked<TransactionsService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<TransactionsService>;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: service }],
    }).compile();
    controller = module.get(TransactionsController);
  });

  it('delegates list and find operations', async () => {
    const transactions = [{ id: 'transaction-id' }] as never[];
    service.findAll.mockResolvedValue(transactions);
    service.findOne.mockResolvedValue(transactions[0]);
    expect(await controller.findAll()).toBe(transactions);
    expect(await controller.findOne('transaction-id')).toBe(transactions[0]);
  });

  it('delegates create and update operations', async () => {
    const dto = { billId: 'bill-id' } as never;
    service.create.mockResolvedValue(dto);
    service.update.mockResolvedValue(dto);
    expect(await controller.create(dto)).toBe(dto);
    expect(await controller.update('transaction-id', dto)).toBe(dto);
  });
});
