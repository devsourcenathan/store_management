import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StockService } from '../stock/stock.service';

import { UserRole } from '@prisma/client';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
    ) { }

    async findAll(storeId: string, user: { id: string; role: string }, customerId?: string) {
        const where: any = {
            storeId,
            ...(customerId && { customerId }),
        };

        // If user is STAFF, they can only see their own sales
        if (user.role === UserRole.STAFF) {
            where.createdBy = user.id;
        }

        return this.prisma.sale.findMany({
            where,
            include: {
                customer: true,
                items: {
                    include: { product: true },
                },
                payments: true,
                creator: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: any, userId: string) {
        const { storeId, customerId, items, notes, discount = 0 } = data;

        // Calculate items total
        const itemsTotal = items.reduce((acc: number, item: any) => {
            const itemTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
            return acc + itemTotal;
        }, 0);

        // Apply global discount
        const totalAmount = Math.max(0, itemsTotal - (discount || 0));

        // Determine paid amount
        const paidAmount = data.paidAmount !== undefined ? data.paidAmount : totalAmount;

        // Determine status
        let status = 'PAID';
        if (paidAmount === 0 && totalAmount > 0) {
            status = 'PENDING';
        } else if (paidAmount < totalAmount) {
            status = 'PARTIAL';
        }

        // Use a transaction to create sale, payment, and stock movements
        const sale = await this.prisma.$transaction(async (tx) => {
            // 1. Create the sale
            const sale = await tx.sale.create({
                data: {
                    storeId,
                    customerId,
                    totalAmount,
                    paidAmount,
                    discount,
                    status: status as any,
                    notes,
                    createdBy: userId,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discount || 0,
                            total: (item.quantity * item.unitPrice) - (item.discount || 0),
                        })),
                    },
                },
            });

            // 2. Create Payment Record (only if there is a paid amount)
            if (paidAmount > 0) {
                await tx.payment.create({
                    data: {
                        saleId: sale.id,
                        amount: paidAmount,
                        method: data.paymentMethod || 'CASH', // Default to CASH if paying
                        createdBy: userId,
                        notes: 'Initial payment',
                    },
                });
            }

            // 3. Create stock movements for each item
            for (const item of items) {
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        storeId,
                        type: 'OUT',
                        source: 'SALE',
                        quantity: item.quantity,
                        reference: `SALE-${sale.id}`,
                        createdBy: userId,
                    },
                });
            }

            // 5. Return full sale object for receipt
            return tx.sale.findUnique({
                where: { id: sale.id },
                include: {
                    customer: true,
                    items: {
                        include: { product: true },
                    },
                    payments: true,
                },
            });
        });

        // 4. Trigger Stock Alerts (After transaction commit)
        for (const item of items) {
            await this.stockService.checkStockAndAlert(item.productId, storeId);
        }

        return sale;
    }

    async addPayment(saleId: string, data: { amount: number; method: string; notes?: string }, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({ where: { id: saleId } });
            if (!sale) throw new Error('Sale not found');

            const currentPaid = Number(sale.paidAmount);
            const total = Number(sale.totalAmount);
            const newPaymentAmount = Number(data.amount);

            if (currentPaid + newPaymentAmount > total) {
                throw new Error('Payment amount exceeds remaining balance');
            }

            // Create Payment
            await tx.payment.create({
                data: {
                    saleId,
                    amount: newPaymentAmount,
                    method: data.method as any,
                    notes: data.notes,
                    createdBy: userId,
                },
            });

            // Update Sale
            const newPaidAmount = currentPaid + newPaymentAmount;
            let newStatus = sale.status;

            if (newPaidAmount >= total) {
                newStatus = 'PAID';
            } else if (newPaidAmount > 0) {
                newStatus = 'PARTIAL';
            }

            return tx.sale.update({
                where: { id: saleId },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus as any,
                },
            });
        });
    }

    async update(saleId: string, data: any) {
        return this.prisma.sale.update({
            where: { id: saleId },
            data,
            include: {
                customer: true,
                items: {
                    include: { product: true },
                },
                payments: true,
            },
        });
    }
}
