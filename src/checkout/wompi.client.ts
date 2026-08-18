import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionStatus } from '../transactions/transactions.types';
import type {
  PaymentChargeInput,
  PaymentChargeResult,
  PaymentProviderPort,
} from './ports/payment-provider.port';

interface WompiConfig {
  apiBaseUrl: string;
  publicKey: string;
  privateKey: string;
  integrityKey: string;
  timeoutMs: number;
  pollIntervalMs: number;
  pollAttempts: number;
}

interface WompiTransactionData {
  id?: string;
  status?: string;
  status_message?: string;
  reference?: string;
  payment_method?: {
    brand?: string;
    last_four?: string;
    extra?: {
      brand?: string;
      last_four?: string;
      processor_response_code?: string;
    };
  };
}

interface WompiApiResponse<T> {
  data?: T;
}

interface AcceptanceTokens {
  acceptanceToken: string;
  personalDataAuth: string;
}

export type WompiChargeResult = PaymentChargeResult;

export type WompiChargeInput = PaymentChargeInput;

export class WompiConfigurationError extends Error {}

export class WompiApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = WompiApiError.name;
  }
}

@Injectable()
export class WompiClient implements PaymentProviderPort {
  private readonly logger = new Logger(WompiClient.name);

  constructor(private readonly configService: ConfigService) {}

  async charge(input: WompiChargeInput): Promise<WompiChargeResult> {
    const config = this.getConfig();
    const acceptanceTokens = await this.getAcceptanceTokens(config);
    const signature = createHash('sha256')
      .update(
        `${input.reference}${input.amountInCents}${input.currency}${config.integrityKey}`,
      )
      .digest('hex');
    const response = await this.request<WompiApiResponse<WompiTransactionData>>(
      config,
      '/transactions',
      {
        method: 'POST',
        token: config.privateKey,
        body: {
          acceptance_token: acceptanceTokens.acceptanceToken,
          accept_personal_auth: acceptanceTokens.personalDataAuth,
          amount_in_cents: input.amountInCents,
          currency: input.currency,
          customer_email: input.customerEmail,
          payment_method: {
            installments: input.installments,
            token: input.paymentToken,
            type: 'CARD',
          },
          payment_method_type: 'CARD',
          reference: input.reference,
          signature,
        },
      },
    );
    const firstTransaction = this.requireTransaction(response.data);

    if (this.isFinalStatus(firstTransaction.status)) {
      return this.toChargeResult(firstTransaction);
    }

    return this.pollTransactionWithConfig(firstTransaction.id ?? '', config);
  }

  async pollTransaction(providerReference: string): Promise<WompiChargeResult> {
    const config = this.getConfig();
    return this.pollTransactionWithConfig(providerReference, config);
  }

  private async pollTransactionWithConfig(
    providerReference: string,
    config: WompiConfig,
  ): Promise<WompiChargeResult> {
    if (!providerReference) {
      throw new WompiApiError('Provider transaction ID was not returned.', 502);
    }

    let latestTransaction: WompiTransactionData | null = null;

    for (let attempt = 0; attempt <= config.pollAttempts; attempt += 1) {
      if (attempt > 0) {
        await this.delay(config.pollIntervalMs);
      }

      const response = await this.request<
        WompiApiResponse<WompiTransactionData>
      >(config, `/transactions/${encodeURIComponent(providerReference)}`, {
        method: 'GET',
        token: config.publicKey,
      });
      latestTransaction = this.requireTransaction(response.data);

      if (this.isFinalStatus(latestTransaction.status)) {
        return this.toChargeResult(latestTransaction);
      }
    }

    if (!latestTransaction) {
      throw new WompiApiError('Payment provider returned no transaction.', 502);
    }

    return this.toChargeResult(latestTransaction);
  }

  private async getAcceptanceTokens(
    config: WompiConfig,
  ): Promise<AcceptanceTokens> {
    const response = await this.request<
      WompiApiResponse<{
        presigned_acceptance?: { acceptance_token?: string };
        presigned_personal_data_auth?: { acceptance_token?: string };
      }>
    >(config, `/merchants/${encodeURIComponent(config.publicKey)}`, {
      method: 'GET',
      token: config.publicKey,
    });
    const acceptanceToken =
      response.data?.presigned_acceptance?.acceptance_token;
    const personalDataAuth =
      response.data?.presigned_personal_data_auth?.acceptance_token;

    if (!acceptanceToken || !personalDataAuth) {
      throw new WompiApiError('Acceptance tokens were not returned.', 502);
    }

    return { acceptanceToken, personalDataAuth };
  }

  private getConfig(): WompiConfig {
    const apiBaseUrl = this.configService.get<string>('WOMPI_API_BASE_URL');
    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('WOMPI_PRIVATE_KEY');
    const integrityKey = this.configService.get<string>('WOMPI_INTEGRITY_KEY');
    const timeoutMs = this.configService.get<string>('WOMPI_TIMEOUT_MS');
    const pollIntervalMs = this.configService.get<string>(
      'WOMPI_POLL_INTERVAL_MS',
    );
    const pollAttempts = this.configService.get<string>('WOMPI_POLL_ATTEMPTS');
    const missing = [
      ['WOMPI_API_BASE_URL', apiBaseUrl],
      ['WOMPI_PUBLIC_KEY', publicKey],
      ['WOMPI_PRIVATE_KEY', privateKey],
      ['WOMPI_INTEGRITY_KEY', integrityKey],
      ['WOMPI_TIMEOUT_MS', timeoutMs],
      ['WOMPI_POLL_INTERVAL_MS', pollIntervalMs],
      ['WOMPI_POLL_ATTEMPTS', pollAttempts],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new WompiConfigurationError(
        `Missing payment configuration: ${missing.join(', ')}`,
      );
    }

    if (!apiBaseUrl!.includes('sandbox')) {
      throw new WompiConfigurationError(
        'WOMPI_API_BASE_URL must point to the Sandbox environment.',
      );
    }

    const parsedTimeoutMs = Number(timeoutMs);
    const parsedPollIntervalMs = Number(pollIntervalMs);
    const parsedPollAttempts = Number(pollAttempts);

    if (
      !Number.isInteger(parsedTimeoutMs) ||
      parsedTimeoutMs <= 0 ||
      !Number.isInteger(parsedPollIntervalMs) ||
      parsedPollIntervalMs < 0 ||
      !Number.isInteger(parsedPollAttempts) ||
      parsedPollAttempts < 0
    ) {
      throw new WompiConfigurationError(
        'Payment timeout and polling values must be valid integers.',
      );
    }

    return {
      apiBaseUrl: apiBaseUrl!.replace(/\/$/, ''),
      integrityKey: integrityKey!,
      pollAttempts: parsedPollAttempts,
      pollIntervalMs: parsedPollIntervalMs,
      privateKey: privateKey!,
      publicKey: publicKey!,
      timeoutMs: parsedTimeoutMs,
    };
  }

  private async request<T>(
    config: WompiConfig,
    path: string,
    options: {
      method: 'GET' | 'POST';
      token: string;
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${config.apiBaseUrl}${path}`, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${options.token}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
      const responseText = await response.text();
      let responseBody: unknown = {};

      if (responseText) {
        try {
          responseBody = JSON.parse(responseText) as unknown;
        } catch {
          this.logger.warn(
            `Payment provider returned invalid JSON for ${options.method} ${path}.`,
          );
        }
      }

      if (!response.ok) {
        throw new WompiApiError(
          `Payment provider request failed for ${options.method} ${path}.`,
          response.status,
        );
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof WompiApiError) {
        throw error;
      }

      const errorName = error instanceof Error ? error.name : '';
      if (errorName === 'AbortError') {
        throw new WompiApiError('Payment provider request timed out.', 504);
      }

      throw new WompiApiError('Payment provider request failed.', 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireTransaction(
    transaction: WompiTransactionData | undefined,
  ): WompiTransactionData {
    if (!transaction?.id || !transaction.status) {
      throw new WompiApiError(
        'Payment provider returned an invalid transaction.',
        502,
      );
    }

    return transaction;
  }

  private toChargeResult(transaction: WompiTransactionData): WompiChargeResult {
    const status = String(transaction.status).toUpperCase();
    const method = transaction.payment_method;
    const extra = method?.extra;
    const cardBrand = (extra?.brand ?? method?.brand ?? '').toLowerCase();
    const lastFour = extra?.last_four ?? method?.last_four ?? null;

    return {
      cardBrand: cardBrand || null,
      failureCode:
        status === 'APPROVED'
          ? null
          : (extra?.processor_response_code ??
            transaction.status_message ??
            status),
      lastFour: lastFour && /^\d{4}$/.test(lastFour) ? lastFour : null,
      providerReference: transaction.id ?? null,
      status: this.toLocalStatus(status),
    };
  }

  private toLocalStatus(status: string): TransactionStatus {
    if (status === 'APPROVED') {
      return TransactionStatus.APPROVED;
    }

    if (status === 'DECLINED') {
      return TransactionStatus.DECLINED;
    }

    if (status === 'PENDING') {
      return TransactionStatus.PENDING;
    }

    return TransactionStatus.UNKNOWN;
  }

  private isFinalStatus(status?: string): boolean {
    return ['APPROVED', 'DECLINED', 'ERROR', 'VOIDED'].includes(
      String(status).toUpperCase(),
    );
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }
}
