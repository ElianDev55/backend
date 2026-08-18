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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async findAll(includeDeleted = false): Promise<Customer[]> {
    try {
      return await this.customersRepository.find({
        where: includeDeleted ? undefined : { isDeleted: false },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleDatabaseError(error, 'list customers');
    }
  }

  async findOne(id: string): Promise<Customer> {
    try {
      const customer = await this.customersRepository.findOne({
        where: { id, isDeleted: false },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${id} not found.`);
      }

      return customer;
    } catch (error) {
      throw this.handleDatabaseError(error, `find customer ${id}`);
    }
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      const emailNormalized = this.normalizeEmail(createCustomerDto.email);
      const existingCustomer = await this.customersRepository.findOne({
        where: { emailNormalized },
      });

      if (existingCustomer) {
        existingCustomer.fullName = createCustomerDto.fullName;
        existingCustomer.phone = createCustomerDto.phone;
        existingCustomer.isDeleted = false;
        existingCustomer.deletedAt = null;
        return await this.customersRepository.save(existingCustomer);
      }

      const customer = this.customersRepository.create({
        emailNormalized,
        fullName: createCustomerDto.fullName,
        phone: createCustomerDto.phone,
        isDeleted: false,
        deletedAt: null,
      });

      return await this.customersRepository.save(customer);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create customer');
    }
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    try {
      const customer = await this.findOne(id);

      if (updateCustomerDto.email) {
        const emailNormalized = this.normalizeEmail(updateCustomerDto.email);
        const existingCustomer = await this.customersRepository.findOne({
          where: { emailNormalized },
        });

        if (existingCustomer && existingCustomer.id !== id) {
          throw new ConflictException(
            `Email ${emailNormalized} is already associated with another customer.`,
          );
        }

        customer.emailNormalized = emailNormalized;
      }

      if (updateCustomerDto.fullName !== undefined) {
        customer.fullName = updateCustomerDto.fullName;
      }

      if (updateCustomerDto.phone !== undefined) {
        customer.phone = updateCustomerDto.phone;
      }

      return await this.customersRepository.save(customer);
    } catch (error) {
      throw this.handleDatabaseError(error, `update customer ${id}`);
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      const customer = await this.findOne(id);
      customer.isDeleted = true;
      customer.deletedAt = new Date();
      await this.customersRepository.save(customer);
    } catch (error) {
      throw this.handleDatabaseError(error, `delete customer ${id}`);
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
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
        'A customer with the same unique value already exists.',
      );
    }

    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Unable to ${operation}: ${message}`);
    return new InternalServerErrorException(`Unable to ${operation}.`);
  }
}
