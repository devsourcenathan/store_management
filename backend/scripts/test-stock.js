const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const storeId = 'a90a1706-4725-4987-a150-c0e12171a31e';
    const productId = '618b97d6-410c-421f-9950-5653314b45c8';

    const movements = await prisma.stockMovement.findMany({
        where: {
            productId,
            storeId,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    let total = 0;
    for (const movement of movements) {
        let prev = total;
        switch (movement.type) {
            case 'IN':
            case 'RETURN':
            case 'SUPPLY':
            case 'TRANSFER_IN':
                total += movement.quantity;
                break;
            case 'ADJUST':
                try {
                    const meta = JSON.parse(movement.notes || '{}');
                    const direction = meta.direction || 'IN';
                    total = direction === 'IN' ? total + movement.quantity : total - movement.quantity;
                } catch {
                    total += movement.quantity;
                }
                break;
            case 'OUT':
            case 'SALE':
            case 'TRANSFER_OUT':
            case 'ADJUSTMENT':
                total -= movement.quantity;
                break;
        }
        console.log(`[${movement.createdAt}] ${movement.type} qty:${movement.quantity} -> new total:${total} (from ${prev})`);
    }

    console.log('Final Total:', total);
}

test()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
