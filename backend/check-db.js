const { PrismaClient } = require('./generated/sqlite-client');
const prisma = new PrismaClient({ datasources: { db: { url: "file:C:\\Users\\nathan.tchinda\\AppData\\Roaming\\StockManagement\\stock.db" } } });

async function checkDb() {
    try {
        const orgs = await prisma.organization.findMany();
        console.log("Organizations:", orgs.length);
        const users = await prisma.user.findMany();
        console.log("Users:", users.map(u => ({ id: u.id, email: u.email, role: u.role })));
        const products = await prisma.product.findMany();
        console.log("Products:", products.map(p => ({ id: p.id, name: p.name, sku: p.sku })));
        const permissions = await prisma.permission.findMany();
        console.log("Global Permissions:", permissions.length);
        const rolePermissions = await prisma.rolePermission.findMany();
        console.log("Role Permissions:", rolePermissions.length);
        const userPermissions = await prisma.userPermission.findMany();
        console.log("User Permissions:", userPermissions.length);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDb();
