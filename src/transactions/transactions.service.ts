import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Bill } from '../bills/entities/bill.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionStatus } from './transactions.types';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Bill)
    private readonly billsRepository: Repository<Bill>,
  ) {}

  async findAll(): Promise<Transaction[]> {
    try {
      return await this.transactionsRepository.find({
        relations: { bill: true },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleDatabaseError(error, 'list transactions');
    }
  }

  async findOne(id: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionsRepository.findOne({
        where: { id },
        relations: { bill: true },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction ${id} not found.`);
      }

      return transaction;
    } catch (error) {
      throw this.handleDatabaseError(error, `find transaction ${id}`);
    }
  }

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    try {
      const existingTransaction = await this.transactionsRepository.findOne({
        where: { idempotencyKey: createTransactionDto.idempotencyKey },
      });

      if (existingTransaction) {
        if (
          createTransactionDto.requestHash &&
          existingTransaction.requestHash &&
          createTransactionDto.requestHash !== existingTransaction.requestHash
        ) {
          throw new ConflictException(
            'The idempotency key was already used with a different request.',
          );
        }

        return await this.findOne(existingTransaction.id);
      }

      const bill = await this.billsRepository.findOne({
        where: { id: createTransactionDto.billId },
      });

      if (!bill) {
        throw new NotFoundException(
          `Bill ${createTransactionDto.billId} not found.`,
        );
      }

      const lastTransaction = await this.transactionsRepository.findOne({
        where: { bill: { id: bill.id } },
        order: { attemptNumber: 'DESC' },
      });
      const transaction = this.transactionsRepository.create({
        bill,
        attemptNumber:
          createTransactionDto.attemptNumber ??
          (lastTransaction?.attemptNumber ?? 0) + 1,
        status: createTransactionDto.status ?? TransactionStatus.PENDING,
        provider: createTransactionDto.provider,
        providerReference: createTransactionDto.providerReference ?? null,
        idempotencyKey: createTransactionDto.idempotencyKey,
        requestHash: createTransactionDto.requestHash ?? null,
        cardBrand: createTransactionDto.cardBrand ?? null,
        lastFour: createTransactionDto.lastFour ?? null,
        failureCode: createTransactionDto.failureCode ?? null,
      });

      const savedTransaction =
        await this.transactionsRepository.save(transaction);
      return await this.findOne(savedTransaction.id);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create transaction');
    }
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    try {
      const transaction = await this.findOne(id);

      Object.assign(transaction, {
        status: updateTransactionDto.status ?? transaction.status,
        providerReference:
          updateTransactionDto.providerReference ??
          transaction.providerReference,
        requestHash:
          updateTransactionDto.requestHash ?? transaction.requestHash,
        cardBrand: updateTransactionDto.cardBrand ?? transaction.cardBrand,
        lastFour: updateTransactionDto.lastFour ?? transaction.lastFour,
        failureCode:
          updateTransactionDto.failureCode ?? transaction.failureCode,
      });

      await this.transactionsRepository.save(transaction);
      return await this.findOne(id);
    } catch (error) {
      throw this.handleDatabaseError(error, `update transaction ${id}`);
    }
  }

  private handleDatabaseError(
    error: unknown,
    operation: string,
  ): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    ) {
      return new ConflictException(
        'A transaction with the same unique value already exists.',
      );
    }

    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Unable to ${operation}: ${message}`);
    return new InternalServerErrorException(`Unable to ${operation}.`);
  }
}
