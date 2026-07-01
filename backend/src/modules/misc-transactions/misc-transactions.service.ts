import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMiscTransactionDto } from './dto/create-misc-transaction.dto';
import { MiscTransactionType } from '@prisma/client';

@Injectable()
export class MiscTransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: string, userId: string, createDto: CreateMiscTransactionDto) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.miscTransaction.create({
      data: {
        storeId,
        type: createDto.type,
        amount: createDto.amount,
        description: createDto.description,
        createdBy: userId,
        date: createDto.date ? new Date(createDto.date) : new Date(),
      },
    });
  }

  async findAll(storeId: string, userId: string, role: string) {
    const where: any = { storeId };

    // Possible filter logic here based on permissions if needed

    return this.prisma.miscTransaction.findMany({
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
      orderBy: { date: 'desc' },
    });
  }
}
