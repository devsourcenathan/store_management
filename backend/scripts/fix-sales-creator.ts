
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting data fix for orphan records...');

    // 1. Find a fallback user (Preferably an Admin or Owner)
    // You can also hardcode a specific ID if you want: const fallbackUserId = 'user-uuid-here';
    let fallbackUser = await prisma.user.findFirst({
        where: { role: 'OWNER' }
    });

    if (!fallbackUser) {
        console.log('⚠️ No OWNER found, looking for any user...');
        fallbackUser = await prisma.user.findFirst();
    }

    if (!fallbackUser) {
        console.error('❌ No users found in the database. Cannot reassign orphan records.');
        process.exit(1);
    }

    console.log(`✅ Using fallback user: ${fallbackUser.firstName} ${fallbackUser.lastName} (${fallbackUser.email})`);
    const userId = fallbackUser.id;

    try {
        // 2. Fix Sales
        const salesUpdate = await prisma.$executeRawUnsafe(`
            UPDATE "sales" 
            SET "createdBy" = '${userId}' 
            WHERE "createdBy" NOT IN (SELECT "id" FROM "users");
        `);
        console.log(`✅ Fixed ${salesUpdate} sales records.`);

        // 3. Fix Payments
        const paymentsUpdate = await prisma.$executeRawUnsafe(`
            UPDATE "payments" 
            SET "createdBy" = '${userId}' 
            WHERE "createdBy" NOT IN (SELECT "id" FROM "users");
        `);
        console.log(`✅ Fixed ${paymentsUpdate} payment records.`);

        // 4. Fix Stock Movements
        const stockUpdate = await prisma.$executeRawUnsafe(`
            UPDATE "stock_movements" 
            SET "createdBy" = '${userId}' 
            WHERE "createdBy" NOT IN (SELECT "id" FROM "users");
        `);
        console.log(`✅ Fixed ${stockUpdate} stock movement records.`);

        console.log('🎉 Data fix completed successfully.');

    } catch (error) {
        console.error('❌ Error fixing records:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
