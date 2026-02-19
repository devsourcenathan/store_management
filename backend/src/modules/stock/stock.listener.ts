import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StockService } from './stock.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreditFullyPaidEvent } from '../credit/credit.service';

@Injectable()
export class StockListener {
    constructor(
        private stockService: StockService,
        private prisma: PrismaService,
    ) { }

    @OnEvent('credit.fully_paid')
    async handleCreditFullyPaid(payload: CreditFullyPaidEvent) {
        const { saleId, contractId } = payload;
        console.log(`Credit fully paid for sale ${saleId}, checking if stock release is needed...`);

        // Get the contract to check sale type
        const contract = await this.prisma.creditContract.findUnique({
            where: { id: contractId },
        });

        if (!contract || contract.saleType !== 'DELIVERY_AFTER_FULL_PAYMENT') {
            console.log('Stock release not needed (Immediate delivery or contract not found)');
            return;
        }

        // Get sale items to deduct stock
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true },
        });

        if (!sale) return;

        console.log(`Releasing stock for deferred delivery sale ${saleId}`);

        for (const item of sale.items) {
            await this.stockService.createMovement({
                productId: item.productId,
                storeId: sale.storeId,
                type: 'OUT',
                source: 'SALE',
                quantity: item.quantity,
                reference: `SALE-CREDIT-RELEASE-${sale.id}`,
                notes: `Released after credit full payment`,
            }, 'SYSTEM'); // or sale.createdBy
        }
    }
}
