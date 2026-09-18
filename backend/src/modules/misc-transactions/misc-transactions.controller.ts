import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MiscTransactionsService } from './misc-transactions.service';
import { CreateMiscTransactionDto } from './dto/create-misc-transaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('stores/:storeId/misc-transactions')
@UseGuards(JwtAuthGuard)
export class MiscTransactionsController {
  constructor(private readonly miscTransactionsService: MiscTransactionsService) {}

  @Post()
  create(
    @Param('storeId') storeId: string,
    @Body() createDto: CreateMiscTransactionDto,
    @Request() req
  ) {
    return this.miscTransactionsService.create(storeId, req.user.id, createDto);
  }

  @Get()
  findAll(
    @Param('storeId') storeId: string,
    @Request() req
  ) {
    return this.miscTransactionsService.findAll(storeId, req.user.id, req.user.role);
  }
}
