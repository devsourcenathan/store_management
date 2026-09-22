import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCashAdjustmentDto } from './dto/create-cash-adjustment.dto';

@Injectable()
export class CashAdjustmentsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, userId: string, createDto: CreateCashAdjustmentDto) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.cashAdjustment.create({
      data: {
        storeId,
        expected: createDto.expected,
        counted: createDto.counted,
        difference: createDto.difference,
        reason: createDto.reason,
        createdBy: userId,
      },
    });
  }

  async findAll(storeId: string, userId: string, role: string) {
    const where: any = { storeId };

    // If STAFF, optionally restrict to only what they created
    // if (role === 'STAFF') {
    //   where.createdBy = userId;
    // }

    return this.prisma.cashAdjustment.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExpectedCash(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { organizationId: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: store.organizationId },
      select: { cashExpectedMode: true },
    });
    const mode = org?.cashExpectedMode === 'SINCE_LAST_COUNT' ? 'SINCE_LAST_COUNT' : 'DAILY';

    const lastAdjustment = await this.prisma.cashAdjustment.findFirst({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate = startOfToday;
    let startingBalance = 0;

    if (mode === 'DAILY') {
      // Day-based count: an old count must NOT seed today's expected amount
      // (cash is assumed removed after counting). Only a count made today
      // carries over; otherwise the day starts at 0 with today's sales only.
      const lastToday =
        lastAdjustment && lastAdjustment.createdAt > startOfToday ? lastAdjustment : null;
      if (lastToday) {
        startingBalance = Number(lastToday.counted);
        startDate = lastToday.createdAt;
      }
    } else if (lastAdjustment) {
      // Legacy mode: accumulate since the last count, whatever its date.
      startingBalance = Number(lastAdjustment.counted);
      if (lastAdjustment.createdAt > startOfToday) {
        startDate = lastAdjustment.createdAt;
      } else {
        startDate = startOfToday;
      }
    }

    const cashPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        method: 'CASH',
        createdAt: { gt: startDate },
        sale: { storeId },
      },
    });
    const cashSalesAmount = Number(cashPayments._sum.amount) || 0;

    const miscIn = await this.prisma.miscTransaction.aggregate({
      _sum: { amount: true },
      where: {
        storeId,
        type: 'IN',
        createdAt: { gt: startDate },
      },
    });
    const miscInAmount = Number(miscIn._sum.amount) || 0;

    const miscOut = await this.prisma.miscTransaction.aggregate({
      _sum: { amount: true },
      where: {
        storeId,
        type: 'OUT',
        createdAt: { gt: startDate },
      },
    });
    const miscOutAmount = Number(miscOut._sum.amount) || 0;

    const expected = Number((startingBalance + cashSalesAmount + miscInAmount - miscOutAmount).toFixed(2));

    return {
      expected,
      mode,
      lastAdjustmentAt: lastAdjustment ? startDate : null,
      details: {
        startingBalance,
        cashSalesAmount,
        miscInAmount,
        miscOutAmount,
      }
    };
  }
}

