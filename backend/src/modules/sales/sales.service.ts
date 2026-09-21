import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StockService } from '../stock/stock.service';

import { UserRole, CreditSaleType, CreditStatus } from '@prisma/client';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
    ) { }

    // Perf Phase 1: bounded result set + lean selects to avoid overfetch.
    // When page/limit are provided -> { data, meta } envelope.
    // Otherwise legacy array (capped at 200) for backward compatibility.
    async findAll(
        storeId: string,
        user: { id: string; role: string },
        customerId?: string,
        page?: number,
        limit?: number,
    ) {
        const paginated = page !== undefined || limit !== undefined;
        const take = Math.min(Math.max(limit ?? 200, 1), 200);
        const skip = (Math.max(page ?? 1, 1) - 1) * take;

        const where: any = {
            storeId,
            ...(customerId && { customerId }),
        };

        // If user is STAFF, they can only see their own sales
        if (user.role === UserRole.STAFF) {
            where.createdBy = user.id;
        }

        const select = {
            id: true,
            storeId: true,
            customerId: true,
            totalAmount: true,
            paidAmount: true,
            discount: true,
            hasCredit: true,
            status: true,
            notes: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            customer: {
                select: { id: true, name: true, email: true, phone: true },
            },
            items: {
                select: {
                    id: true,
                    productId: true,
                    quantity: true,
                    unitPrice: true,
                    discount: true,
                    total: true,
                    product: {
                        select: { id: true, name: true, sku: true, basePrice: true },
                    },
                },
            },
            payments: {
                select: { id: true, amount: true, method: true, reference: true, notes: true, createdAt: true },
            },
            creator: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            creditContract: {
                select: {
                    id: true,
                    totalAmount: true,
                    paidAmount: true,
                    remainingAmount: true,
                    saleType: true,
                    status: true,
                    dueDate: true,
                            payments: {
                                select: { id: true, amount: true, method: true, paidAt: true },
                                orderBy: { paidAt: 'desc' as const },
                            },
                },
            },
        };

        if (!paginated) {
            return this.prisma.sale.findMany({
                where,
                select,
                orderBy: { createdAt: 'desc' },
                take,
            });
        }

        const [total, sales] = await Promise.all([
            this.prisma.sale.count({ where }),
            this.prisma.sale.findMany({
                where,
                select,
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
        ]);

        return {
            data: sales,
            meta: {
                total,
                page: Math.max(page ?? 1, 1),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    async create(data: any, userId: string) {
        const { storeId, customerId, items, notes, discount = 0, clientId } = data;

        // Idempotency fix: a retried submission (timeout + user retry, double
        // click) carries the same clientId. Return the existing sale instead
        // of creating a duplicate that would skew statistics.
        if (clientId) {
            const existing = await this.prisma.sale.findFirst({
                where: { clientId },
                include: {
                    customer: true,
                    items: { include: { product: true } },
                    payments: true,
                },
            });
            if (existing) return existing;
        }

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
        if (data.creditDetails) {
            status = 'PENDING'; // Credit sales start as PENDING or PARTIAL depending on payment
            if (data.creditDetails.initialPayment > 0) {
                status = 'PARTIAL';
            }
        } else if (paidAmount === 0 && totalAmount > 0) {
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
                    hasCredit: !!data.creditDetails,
                    ...(clientId ? { clientId } : {}),
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

            // 1.5 Create Credit Contract if needed
            if (data.creditDetails) {
                const { saleType, totalAmount, initialPayment, dueDate, creditPaymentMethod } = data.creditDetails;
                const contract = await tx.creditContract.create({
                    data: {
                        saleId: sale.id,
                        totalAmount: totalAmount, // Should match sale total ideally
                        paidAmount: initialPayment || 0,
                        remainingAmount: totalAmount - (initialPayment || 0),
                        saleType: saleType, // IMMEDIATE_DELIVERY or DELIVERY_AFTER_FULL_PAYMENT
                        status: 'ACTIVE',
                        dueDate: dueDate ? new Date(dueDate) : null,
                    }
                });

                // Initial Credit Payment
                if (initialPayment && initialPayment > 0) {
                    await tx.creditPayment.create({
                        data: {
                            contractId: contract.id,
                            amount: initialPayment,
                            method: creditPaymentMethod || 'CASH',
                            paidAt: new Date(),
                        }
                    });
                }
            }

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
            // CHECK: IF credit sale AND type is DELIVERY_AFTER_FULL_PAYMENT, SKIP movement
            const shouldMoveStock = !data.creditDetails || data.creditDetails.saleType !== 'DELIVERY_AFTER_FULL_PAYMENT';

            if (shouldMoveStock) {
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
