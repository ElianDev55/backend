import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChargeCheckoutDto } from './dto/charge-checkout.dto';
import { PrepareCheckoutDto } from './dto/prepare-checkout.dto';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
@ApiTags('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('prepare')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a pending checkout and reserve stock' })
  @ApiResponse({ status: 201, description: 'Checkout prepared successfully.' })
  @ApiResponse({
    status: 409,
    description: 'Insufficient stock or duplicate checkout.',
  })
  prepare(@Body() prepareCheckoutDto: PrepareCheckoutDto) {
    return this.checkoutService.prepare(prepareCheckoutDto);
  }

  @Post(':transactionId/charge')
  @ApiOperation({ summary: 'Charge a prepared checkout through Sandbox' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Checkout status returned.' })
  @ApiResponse({
    status: 503,
    description: 'Payment provider is not configured or unavailable.',
  })
  charge(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() chargeCheckoutDto: ChargeCheckoutDto,
  ) {
    return this.checkoutService.charge(transactionId, chargeCheckoutDto);
  }

  @Get(':transactionId/status')
  @ApiOperation({ summary: 'Get the local checkout status' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Checkout status returned.' })
  @ApiResponse({ status: 404, description: 'Checkout not found.' })
  getStatus(@Param('transactionId', ParseUUIDPipe) transactionId: string) {
    return this.checkoutService.getStatus(transactionId);
  }
}
