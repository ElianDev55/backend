import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillsService } from './bills.service';

@Controller('bills')
@ApiTags('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @ApiOperation({ summary: 'List bills with customer and item relations' })
  @ApiResponse({ status: 200, description: 'Bills returned successfully.' })
  findAll() {
    return this.billsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bill by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Bill returned successfully.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a bill with product snapshots' })
  @ApiResponse({ status: 201, description: 'Bill created successfully.' })
  @ApiResponse({ status: 404, description: 'Customer or product not found.' })
  create(@Body() createBillDto: CreateBillDto) {
    return this.billsService.create(createBillDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bill status or fees' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Bill updated successfully.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBillDto: UpdateBillDto,
  ) {
    return this.billsService.update(id, updateBillDto);
  }
}
