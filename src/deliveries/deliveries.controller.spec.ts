import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

describe('DeliveriesController', () => {
  let controller: DeliveriesController;
  let service: jest.Mocked<DeliveriesService>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<DeliveriesService>;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveriesController],
      providers: [{ provide: DeliveriesService, useValue: service }],
    }).compile();
    controller = module.get(DeliveriesController);
  });

  it('delegates list and find operations', async () => {
    const deliveries = [{ id: 'delivery-id' }] as never[];
    service.findAll.mockResolvedValue(deliveries);
    service.findOne.mockResolvedValue(deliveries[0]);
    expect(await controller.findAll()).toBe(deliveries);
    expect(await controller.findOne('delivery-id')).toBe(deliveries[0]);
  });

  it('delegates create and update operations', async () => {
    const dto = { billId: 'bill-id' } as never;
    service.create.mockResolvedValue(dto);
    service.update.mockResolvedValue(dto);
    expect(await controller.create(dto)).toBe(dto);
    expect(await controller.update('delivery-id', dto)).toBe(dto);
  });
});
