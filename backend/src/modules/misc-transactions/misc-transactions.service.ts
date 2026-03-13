import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMiscTransactionDto } from './dto/create-misc-transaction.dto';
import { Prisma, MiscTransactionType } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface MiscTransactionFilter {
    organizationId: string;
    storeId?: string;
    type?: MiscTransactionType;
    startDate?: string;
    endDate?: string;
    createdBy?: string;
}

export interface MiscTransactionSummary {
    totalIn: number;
    totalOut: number;
    netMisc: number;
    count: number;
}

@Injectable()
export class MiscTransactionsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        dto: CreateMiscTransactionDto,
        userId: string,
        organizationId: string,
    ) {
        const date = dto.date ? new Date(dto.date) : new Date();

        return this.prisma.miscTransaction.create({
            data: {
                storeId: dto.storeId,
                organizationId,
                date,
                type: dto.type,
                amount: new Prisma.Decimal(dto.amount),
                description: dto.description,
                createdBy: userId,
            },
        });
    }

    async findAll(filter: MiscTransactionFilter) {
        const { organizationId, storeId, type, startDate, endDate, createdBy } = filter;

        const where: Prisma.MiscTransactionWhereInput = {
            organizationId,
            ...(storeId && { storeId }),
            ...(type && { type }),
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

        return this.prisma.miscTransaction.findMany({
            where,
            orderBy: { date: 'desc' },
        });
    }

    async getSummary(
        organizationId: string,
        startDate?: Date,
        endDate?: Date,
        storeId?: string,
    ): Promise<MiscTransactionSummary> {
        const transactions = await this.prisma.miscTransaction.findMany({
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
            select: { type: true, amount: true },
        });

        let totalIn = 0;
        let totalOut = 0;

        for (const tx of transactions) {
            const amount = tx.amount.toNumber();
            if (tx.type === 'IN') totalIn += amount;
            else totalOut += amount;
        }

        return {
            totalIn,
            totalOut,
            netMisc: totalIn - totalOut,
            count: transactions.length,
        };
    }
}
