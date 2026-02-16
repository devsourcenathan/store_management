import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStockCalculation() {
    const productId = '618b97d6-410c-421f-9950-5653314b45c8';
    const storeId = 'a90a1706-4725-4987-a150-c0e12171a31e';

    console.log('=== Fetching all movements for Laptop ===');

    const movements = await prisma.stockMovement.findMany({
        where: {
            productId,
            storeId,
        },
        orderBy: {
            createdAt: 'asc',
        },
        select: {
            id: true,
            type: true,
            quantity: true,
            notes: true,
            createdAt: true,
        },
    });

    console.log(`\nFound ${movements.length} movements:\n`);

    let runningTotal = 0;

    movements.forEach((movement, index) => {
        console.log(`\n--- Movement ${index + 1} ---`);
        console.log(`Type: ${movement.type}`);
        console.log(`Quantity: ${movement.quantity}`);
        console.log(`Created: ${movement.createdAt}`);

        if (movement.type === 'ADJUST') {
            try {
                const meta = JSON.parse(movement.notes || '{}');
                console.log(`Direction: ${meta.direction}`);
                console.log(`Previous Stock: ${meta.previousStock}`);
                console.log(`Target Stock: ${meta.targetStock}`);

                if (meta.direction === 'IN') {
                    runningTotal += movement.quantity;
                    console.log(`Action: ADD ${movement.quantity}`);
                } else {
                    runningTotal -= movement.quantity;
                    console.log(`Action: SUBTRACT ${movement.quantity}`);
                }
            } catch (e) {
                console.log('Failed to parse notes, using default IN');
                runningTotal += movement.quantity;
            }
        } else if (['IN', 'RETURN', 'SUPPLY', 'TRANSFER_IN'].includes(movement.type)) {
            runningTotal += movement.quantity;
            console.log(`Action: ADD ${movement.quantity}`);
        } else if (['OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(movement.type)) {
            runningTotal -= movement.quantity;
            console.log(`Action: SUBTRACT ${movement.quantity}`);
        }

        console.log(`Running Total: ${runningTotal}`);
    });

    console.log(`\n=== FINAL STOCK: ${runningTotal} ===\n`);

    await prisma.$disconnect();
}

testStockCalculation().catch(console.error);
