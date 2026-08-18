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
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryStatus } from './deliveries.types';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Delivery } from './entities/delivery.entity';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    @InjectRepository(Delivery)
    private readonly deliveriesRepository: Repository<Delivery>,
    @InjectRepository(Bill)
    private readonly billsRepository: Repository<Bill>,
  ) {}

  async findAll(): Promise<Delivery[]> {
    try {
      return await this.deliveriesRepository.find({
        relations: { bill: true },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw this.handleDatabaseError(error, 'list deliveries');
    }
  }

  async findOne(id: string): Promise<Delivery> {
    try {
      const delivery = await this.deliveriesRepository.findOne({
        where: { id },
        relations: { bill: true },
      });

      if (!delivery) {
        throw new NotFoundException(`Delivery ${id} not found.`);
      }

      return delivery;
    } catch (error) {
      throw this.handleDatabaseError(error, `find delivery ${id}`);
    }
  }

  async create(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
    try {
      const bill = await this.billsRepository.findOne({
        where: { id: createDeliveryDto.billId },
      });

      if (!bill) {
        throw new NotFoundException(
          `Bill ${createDeliveryDto.billId} not found.`,
        );
      }

      const existingDelivery = await this.deliveriesRepository.findOne({
        where: { bill: { id: createDeliveryDto.billId } },
      });

      if (existingDelivery) {
        throw new ConflictException(
          `Bill ${createDeliveryDto.billId} already has a delivery.`,
        );
      }

      const delivery = this.deliveriesRepository.create({
        bill,
        status: createDeliveryDto.status ?? DeliveryStatus.PENDING,
        recipientName: createDeliveryDto.recipientName,
        addressLine: createDeliveryDto.addressLine,
        city: createDeliveryDto.city,
        state: createDeliveryDto.state,
        postalCode: createDeliveryDto.postalCode,
        country: createDeliveryDto.country.toUpperCase(),
      });

      const savedDelivery = await this.deliveriesRepository.save(delivery);
      return await this.findOne(savedDelivery.id);
    } catch (error) {
      throw this.handleDatabaseError(error, 'create delivery');
    }
  }

  async update(
    id: string,
    updateDeliveryDto: UpdateDeliveryDto,
  ): Promise<Delivery> {
    try {
      const delivery = await this.findOne(id);

      Object.assign(delivery, {
        status: updateDeliveryDto.status ?? delivery.status,
        recipientName:
          updateDeliveryDto.recipientName ?? delivery.recipientName,
        addressLine: updateDeliveryDto.addressLine ?? delivery.addressLine,
        city: updateDeliveryDto.city ?? delivery.city,
        state: updateDeliveryDto.state ?? delivery.state,
        postalCode: updateDeliveryDto.postalCode ?? delivery.postalCode,
        country: updateDeliveryDto.country?.toUpperCase() ?? delivery.country,
      });

      await this.deliveriesRepository.save(delivery);
      return await this.findOne(id);
    } catch (error) {
      throw this.handleDatabaseError(error, `update delivery ${id}`);
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
      return new ConflictException('A bill can only have one delivery.');
    }

    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`Unable to ${operation}: ${message}`);
    return new InternalServerErrorException(`Unable to ${operation}.`);
  }
}
