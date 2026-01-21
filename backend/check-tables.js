const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
    try {
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        console.log('Tables:');
        tables.forEach(t => console.log(`  - ${t.table_name}`));
        
        // Check if subscription_accounts exists
        const hasSubscriptionAccounts = tables.some(t => t.table_name === 'subscription_accounts');
        console.log(`\nsubscription_accounts exists: ${hasSubscriptionAccounts}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
