import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCashAdjustmentDto } from './dto/create-cash-adjustment.dto';
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface CashAdjustmentFilter {
    organizationId: string;
    storeId?: string;
    startDate?: string;
    endDate?: string;
    createdBy?: string;
}

export interface CashAdjustmentSummary {
    count: number;
    totalSurplus: number;
    totalDeficit: number;
    netDifference: number;
}

@Injectable()
export class CashAdjustmentsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        dto: CreateCashAdjustmentDto,
        userId: string,
        organizationId: string,
    ) {
        const expected = new Prisma.Decimal(dto.expected);
        const counted = new Prisma.Decimal(dto.counted);
        const difference = counted.minus(expected);

        const date = dto.date ? new Date(dto.date) : new Date();

        return this.prisma.cashAdjustment.create({
            data: {
                storeId: dto.storeId,
                organizationId,
                date,
                expected,
                counted,
                difference,
                reason: dto.reason ?? null,
                createdBy: userId,
            },
        });
    }

    async findAll(filter: CashAdjustmentFilter) {
        const { organizationId, storeId, startDate, endDate, createdBy } = filter;

        const where: Prisma.CashAdjustmentWhereInput = {
            organizationId,
            ...(storeId && { storeId }),
            ...(createdBy && { createdBy }),
            ...(startDate || endDate
                ? {
                      date: {
                          ...(startDate && { gte: startOfDay(new Date(startDate)) }),
                          ...(endDate && { lte: endOfDay(new Date(endDate)) }),
                      },
                  }
                : {}),
        };

        return this.prisma.cashAdjustment.findMany({
            where,
            orderBy: { date: 'desc' },
        });
    }

    async getSummary(
        organizationId: string,
        startDate?: Date,
        endDate?: Date,
        storeId?: string,
    ): Promise<CashAdjustmentSummary> {
        const adjustments = await this.prisma.cashAdjustment.findMany({
            where: {
                organizationId,
                ...(storeId && { storeId }),
                ...(startDate || endDate
                    ? {
                          date: {
                              ...(startDate && { gte: startDate }),
                              ...(endDate && { lte: endDate }),
                          },
                      }
                    : {}),
            },
            select: { difference: true },
        });

        let totalSurplus = 0;
        let totalDeficit = 0;

        for (const adj of adjustments) {
            const diff = adj.difference.toNumber();
            if (diff > 0) totalSurplus += diff;
            else totalDeficit += Math.abs(diff);
        }

        return {
            count: adjustments.length,
            totalSurplus,
            totalDeficit,
            netDifference: totalSurplus - totalDeficit,
        };
    }
}
