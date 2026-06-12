const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Uses postgres

async function checkDb() {
    try {
        const owner = await prisma.user.findUnique({ where: { email: 'owner@demo.com' }});
        console.log("Owner org ID:", owner.organizationId);

        const products = await prisma.product.findMany({ where: { organizationId: owner.organizationId }});
        console.log("Products for this org:", products.map(p => ({ id: p.id, name: p.name, sku: p.sku })));

        const rolePermissions = await prisma.rolePermission.findMany({ where: { organizationId: owner.organizationId }});
        console.log("Role Permissions for this org:", rolePermissions.length);
        
        const userPermissions = await prisma.userPermission.findMany({ where: { user: { organizationId: owner.organizationId } }});
        console.log("User Permissions for this org:", userPermissions.length);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
