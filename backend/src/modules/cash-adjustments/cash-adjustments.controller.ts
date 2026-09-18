import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CashAdjustmentsService } from './cash-adjustments.service';
import { CreateCashAdjustmentDto } from './dto/create-cash-adjustment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('stores/:storeId/cash-adjustments')
@UseGuards(JwtAuthGuard)
export class CashAdjustmentsController {
  constructor(private readonly cashAdjustmentsService: CashAdjustmentsService) {}

  @Get('expected')
  getExpectedCash(@Param('storeId') storeId: string) {
    return this.cashAdjustmentsService.getExpectedCash(storeId);
  }

  @Post()
  create(
    @Param('storeId') storeId: string,
    @Body() createDto: CreateCashAdjustmentDto,
    @Request() req
  ) {
    return this.cashAdjustmentsService.create(storeId, req.user.id, createDto);
  }

  @Get()
  findAll(
    @Param('storeId') storeId: string,
    @Request() req
  ) {
    return this.cashAdjustmentsService.findAll(storeId, req.user.id, req.user.role);
  }
}
