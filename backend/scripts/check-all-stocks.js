const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllStocks() {
    const products = await prisma.product.findMany({});
    const stores = await prisma.store.findMany({});
    
    console.log(`Checking ${products.length} products against ${stores.length} stores...\n`);
    
    for (const store of stores) {
        console.log(`\nStore: ${store.name} (${store.id})`);
        
        for (const product of products) {
            const movements = await prisma.stockMovement.findMany({
                where: {
                    productId: product.id,
                    storeId: store.id,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
            
            if (movements.length === 0) continue;
            
            let total = 0;
            movements.forEach(movement => {
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
            });
            
            console.log(`  Product: ${product.name} (${product.id}) => Stock: ${total}`);
        }
    }
}

checkAllStocks().finally(() => prisma.$disconnect());
