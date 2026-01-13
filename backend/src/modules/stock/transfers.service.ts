import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StockCalculationService } from './stock-calculation.service';
import { v4 as uuidv4 } from 'uuid';

interface CreateTransferDto {
    productId: string;
    sourceStoreId: string;
    destinationStoreId: string;
    quantity: number;
    notes?: string;
    createdBy: string;
}

@Injectable()
export class TransfersService {
    constructor(
        private prisma: PrismaService,
        private stockCalculation: StockCalculationService
    ) { }

    async createTransfer(data: CreateTransferDto) {
        const { productId, sourceStoreId, destinationStoreId, quantity, notes, createdBy } = data;

        // Validation
        if (sourceStoreId === destinationStoreId) {
            throw new BadRequestException('Source and destination stores must be different');
        }

        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than zero');
        }

        // Check if product exists
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw new BadRequestException('Product not found');
        }

        // Check current stock in source store using the calculation service
        const currentStock = await this.stockCalculation.calculateCurrentStock(productId, sourceStoreId);

        if (currentStock < quantity) {
            throw new BadRequestException(`Insufficient stock in source store. Available: ${currentStock}, Requested: ${quantity}`);
        }

        // Generate unique reference for linking the two movements
        const transferReference = `TRANSFER-${uuidv4()}`;

        // Create both movements in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create OUT movement from source store
            const outMovement = await tx.stockMovement.create({
                data: {
                    productId,
                    storeId: sourceStoreId,
                    type: 'TRANSFER_OUT',
                    source: 'MANUAL',
                    quantity,
                    reference: transferReference,
                    notes: notes || `Transfer to destination store`,
                    createdBy
                }
            });

            // Create IN movement to destination store
            const inMovement = await tx.stockMovement.create({
                data: {
                    productId,
                    storeId: destinationStoreId,
                    type: 'TRANSFER_IN',
                    source: 'MANUAL',
                    quantity,
                    reference: transferReference,
                    notes: notes || `Transfer from source store`,
                    createdBy
                }
            });

            return { outMovement, inMovement, transferReference };
        });

        return result;
    }

    async getTransferHistory(organizationId: string) {
        // Get all transfer movements grouped by reference
        const transfers = await this.prisma.stockMovement.findMany({
            where: {
                type: {
                    in: ['TRANSFER_OUT', 'TRANSFER_IN']
                },
                store: {
                    organizationId
                }
            },
            include: {
                product: {
                    select: {
                        name: true,
                        sku: true
                    }
                },
                store: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Group by reference
        const groupedTransfers = transfers.reduce((acc, movement) => {
            const ref = movement.reference || movement.id;
            if (!acc[ref]) {
                acc[ref] = [];
            }
            acc[ref].push(movement);
            return acc;
        }, {} as Record<string, any[]>);

        return Object.values(groupedTransfers);
    }
}
