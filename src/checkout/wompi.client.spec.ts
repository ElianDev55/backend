import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionStatus } from '../transactions/transactions.types';
import {
  WompiApiError,
  WompiClient,
  WompiConfigurationError,
} from './wompi.client';

describe('WompiClient', () => {
  let client: WompiClient;
  let configService: jest.Mocked<ConfigService>;
  let fetchMock: jest.Mock;

  const validConfig = {
    WOMPI_API_BASE_URL: 'https://api-sandbox.co.uat.wompi.dev/v1',
    WOMPI_INTEGRITY_KEY: 'integrity-key',
    WOMPI_POLL_ATTEMPTS: '10',
    WOMPI_POLL_INTERVAL_MS: '100',
    WOMPI_PRIVATE_KEY: 'private-key',
    WOMPI_PUBLIC_KEY: 'public-key',
    WOMPI_TIMEOUT_MS: '5000',
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn(
        (key: string) => validConfig[key as keyof typeof validConfig],
      ),
    } as unknown as jest.Mocked<ConfigService>;

    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WompiClient,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    client = module.get<WompiClient>(WompiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('configuration validation', () => {
    it('should throw WompiConfigurationError when a variable is missing', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        client.charge({
          amountInCents: 10000,
          currency: 'COP',
          customerEmail: 'test@example.com',
          installments: 1,
          paymentToken: 'tok_test',
          reference: 'REF-001',
        }),
      ).rejects.toThrow(WompiConfigurationError);
    });

    it('should throw WompiConfigurationError for non-sandbox URL', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'WOMPI_API_BASE_URL'
          ? 'https://api.prod.wompi.dev/v1'
          : validConfig[key as keyof typeof validConfig],
      );

      await expect(
        client.charge({
          amountInCents: 10000,
          currency: 'COP',
          customerEmail: 'test@example.com',
          installments: 1,
          paymentToken: 'tok_test',
          reference: 'REF-001',
        }),
      ).rejects.toThrow('must point to the Sandbox environment');
    });

    it('should throw WompiConfigurationError for invalid timeout values', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'WOMPI_TIMEOUT_MS'
          ? 'not-a-number'
          : validConfig[key as keyof typeof validConfig],
      );

      await expect(
        client.charge({
          amountInCents: 10000,
          currency: 'COP',
          customerEmail: 'test@example.com',
          installments: 1,
          paymentToken: 'tok_test',
          reference: 'REF-001',
        }),
      ).rejects.toThrow('valid integers');
    });
  });

  describe('charge', () => {
    it('should return APPROVED when provider responds with final status', async () => {
      fetchMock
        .mockResolvedValueOnce(
          createFetchResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'acc-token' },
              presigned_personal_data_auth: { acceptance_token: 'auth-token' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createFetchResponse({
            data: {
              id: 'provider-ref-1',
              payment_method: {
                extra: { brand: 'VISA', last_four: '4242' },
              },
              status: 'APPROVED',
            },
          }),
        );

      const result = await client.charge({
        amountInCents: 10000,
        currency: 'COP',
        customerEmail: 'test@example.com',
        installments: 1,
        paymentToken: 'tok_test',
        reference: 'REF-001',
      });

      expect(result.status).toBe(TransactionStatus.APPROVED);
      expect(result.providerReference).toBe('provider-ref-1');
      expect(result.cardBrand).toBe('visa');
      expect(result.lastFour).toBe('4242');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should poll when provider returns PENDING', async () => {
      jest.useFakeTimers();
      fetchMock
        .mockResolvedValueOnce(
          createFetchResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'acc-token' },
              presigned_personal_data_auth: { acceptance_token: 'auth-token' },
            },
          }),
        )
        .mockResolvedValueOnce(
          createFetchResponse({
            data: { id: 'provider-ref-2', status: 'PENDING' },
          }),
        )
        .mockResolvedValueOnce(
          createFetchResponse({
            data: {
              id: 'provider-ref-2',
              payment_method: {
                extra: { brand: 'MASTERCARD', last_four: '1111' },
              },
              status: 'DECLINED',
              status_message: 'Card declined',
            },
          }),
        );

      const chargePromise = client.charge({
        amountInCents: 10000,
        currency: 'COP',
        customerEmail: 'test@example.com',
        installments: 1,
        paymentToken: 'tok_test',
        reference: 'REF-002',
      });

      await jest.advanceTimersByTimeAsync(200);
      const result = await chargePromise;

      expect(result.status).toBe(TransactionStatus.DECLINED);
      expect(result.failureCode).toBe('Card declined');
    });

    it('should map 4xx provider errors to DECLINED', async () => {
      fetchMock
        .mockResolvedValueOnce(
          createFetchResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'acc-token' },
              presigned_personal_data_auth: { acceptance_token: 'auth-token' },
            },
          }),
        )
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          text: jest.fn().mockResolvedValue('Invalid token'),
        });

      await expect(
        client.charge({
          amountInCents: 10000,
          currency: 'COP',
          customerEmail: 'test@example.com',
          installments: 1,
          paymentToken: 'tok_invalid',
          reference: 'REF-003',
        }),
      ).rejects.toThrow(WompiApiError);
    });
  });

  describe('pollTransaction', () => {
    it('should return final status without polling', async () => {
      fetchMock.mockResolvedValueOnce(
        createFetchResponse({
          data: {
            id: 'provider-ref-3',
            payment_method: {},
            status: 'ERROR',
          },
        }),
      );

      const result = await client.pollTransaction('provider-ref-3');

      expect(result.status).toBe(TransactionStatus.UNKNOWN);
    });

    it('should throw when provider reference is empty', async () => {
      await expect(client.pollTransaction('')).rejects.toThrow(WompiApiError);
    });
  });

  function createFetchResponse(body: unknown) {
    return {
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    } as unknown as Response;
  }
});
