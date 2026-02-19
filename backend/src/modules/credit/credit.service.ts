import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreditSaleType, CreditStatus, PaymentMethod } from '@prisma/client';

export class CreditFullyPaidEvent {
    constructor(public readonly saleId: string, public readonly contractId: string) { }
}

@Injectable()
export class CreditService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) { }

    async create(data: {
        saleId: string;
        totalAmount: number;
        saleType: CreditSaleType;
        dueDate?: Date;
        initialPayment?: number;
        paymentMethod?: PaymentMethod;
    }, userId: string) {

        const existing = await this.prisma.creditContract.findUnique({ where: { saleId: data.saleId } });
        if (existing) throw new BadRequestException('Credit contract already exists for this sale');

        return this.prisma.$transaction(async (tx) => {
            // Create Contract
            const contract = await tx.creditContract.create({
                data: {
                    saleId: data.saleId,
                    totalAmount: data.totalAmount,
                    paidAmount: data.initialPayment || 0,
                    remainingAmount: data.totalAmount - (data.initialPayment || 0),
                    saleType: data.saleType,
                    status: CreditStatus.ACTIVE,
                    dueDate: data.dueDate,
                }
            });

            // Add Initial Payment if any
            if (data.initialPayment && data.initialPayment > 0) {
                await tx.creditPayment.create({
                    data: {
                        contractId: contract.id,
                        amount: data.initialPayment,
                        method: data.paymentMethod || PaymentMethod.CASH,
                    }
                });
            }

            return contract;
        });
    }

    async addPayment(contractId: string, data: { amount: number; method: PaymentMethod }, userId: string) {
        const contract = await this.prisma.creditContract.findUnique({ where: { id: contractId } });
        if (!contract) throw new NotFoundException('Credit contract not found');

        if (data.amount <= 0) throw new BadRequestException('Amount must be positive');
        if (data.amount > contract.remainingAmount) throw new BadRequestException('Amount exceeds remaining balance');

        return this.prisma.$transaction(async (tx) => {
            // Create Payment
            const payment = await tx.creditPayment.create({
                data: {
                    contractId,
                    amount: data.amount,
                    method: data.method,
                }
            });

            // Update Contract
            const newPaid = contract.paidAmount + data.amount;
            const newRemaining = contract.remainingAmount - data.amount;
            const isFullyPaid = newRemaining <= 0;

            const updatedContract = await tx.creditContract.update({
                where: { id: contractId },
                data: {
                    paidAmount: newPaid,
                    remainingAmount: newRemaining,
                    status: isFullyPaid ? CreditStatus.COMPLETED : CreditStatus.ACTIVE,
                }
            });

            if (isFullyPaid) {
                this.eventEmitter.emit('credit.fully_paid', new CreditFullyPaidEvent(updatedContract.saleId, updatedContract.id));
            }

            return updatedContract;
        });
    }

    async findOne(id: string) {
        return this.prisma.creditContract.findUnique({
            where: { id },
            include: {
                payments: { orderBy: { paidAt: 'desc' } },
                sale: {
                    include: {
                        items: { include: { product: true } },
                        customer: true
                    }
                }
            },
        });
    }

    async findBySale(saleId: string) {
        return this.prisma.creditContract.findUnique({
            where: { saleId },
            include: {
                payments: true,
            },
        });
    }

    async findAll(storeId: string, status?: string) {
        return this.prisma.creditContract.findMany({
            where: {
                sale: { storeId },
                ...(status && { status: status as any }),
            },
            include: {
                sale: {
                    include: { customer: true }
                },
                payments: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
