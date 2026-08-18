import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { ChargeCheckoutDto } from './dto/charge-checkout.dto';
import { PrepareCheckoutDto } from './dto/prepare-checkout.dto';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let service: jest.Mocked<CheckoutService>;

  beforeEach(async () => {
    service = {
      charge: jest.fn(),
      getStatus: jest.fn(),
      prepare: jest.fn(),
    } as unknown as jest.Mocked<CheckoutService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: service }],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
  });

  const mockResponse = {
    amountInCents: 100000,
    billId: 'bill-id',
    billNumber: 'BILL-001',
    currency: 'COP',
    providerReference: null,
    status: 'PENDING',
    transactionId: 'transaction-id',
    transactionNumber: 'transaction-id',
  };

  it('should prepare a checkout', async () => {
    const dto: PrepareCheckoutDto = {
      baseFeeInCents: 0,
      currency: 'COP',
      customer: { email: 'test@example.com', fullName: 'Test', phone: '300' },
      delivery: {
        addressLine: 'Calle 1',
        city: 'Bogota',
        country: 'CO',
        postalCode: '110111',
        recipientName: 'Test',
        state: 'Cund',
      },
      deliveryFeeInCents: 0,
      idempotencyKey: 'idem',
      productId: 'product-id',
      quantity: 1,
    };
    service.prepare.mockResolvedValue(mockResponse);

    const result = await controller.prepare(dto);

    expect(service.prepare).toHaveBeenCalledWith(dto);
    expect(result).toBe(mockResponse);
  });

  it('should charge a checkout', async () => {
    const dto: ChargeCheckoutDto = {
      installments: 1,
      paymentToken: 'tok_test',
      personalDataAccepted: true,
      termsAccepted: true,
    };
    service.charge.mockResolvedValue({ ...mockResponse, status: 'APPROVED' });

    const result = await controller.charge('transaction-id', dto);

    expect(service.charge).toHaveBeenCalledWith('transaction-id', dto);
    expect(result.status).toBe('APPROVED');
  });

  it('should return checkout status', async () => {
    service.getStatus.mockResolvedValue(mockResponse);

    const result = await controller.getStatus('transaction-id');

    expect(service.getStatus).toHaveBeenCalledWith('transaction-id');
    expect(result).toBe(mockResponse);
  });
});
