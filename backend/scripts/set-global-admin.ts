import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('❌ Please provide an email address.');
        console.log('Usage: npx ts-node scripts/set-global-admin.ts <email>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`❌ User with email "${email}" not found.`);
            process.exit(1);
        }

        const updatedUser = await prisma.user.update({
            where: { email },
            data: { role: UserRole.GLOBAL_ADMIN },
        });

        console.log(`✅ Successfully promoted ${updatedUser.email} to GLOBAL_ADMIN!`);
        console.log(`👤 Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
        console.log(`🔑 ID: ${updatedUser.id}`);

    } catch (error) {
        console.error('❌ An error occurred:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
