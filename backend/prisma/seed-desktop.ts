/**
 * Desktop bundle seed — driven by prisma/desktop-seed.config.json (edit before build).
 * Run via: npm run desktop:build-seed-db
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

type DesktopSeedConfig = {
    organization: { name: string; address?: string; email?: string };
    stores: { name: string; address?: string }[];
    users: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: 'OWNER' | 'MANAGER' | 'STAFF' | 'GLOBAL_ADMIN';
        storeIndexes?: number[];
    }[];
    seedPermissions?: boolean;
};

const defaultPermissions = [
    { resource: 'dashboard', name: 'Dashboard', category: 'overview', description: 'Access to main dashboard' },
    { resource: 'sales', name: 'Sales History', category: 'commercial', description: 'View and manage sales' },
    { resource: 'pos', name: 'Point of Sale', category: 'commercial', description: 'Access POS system' },
    { resource: 'customers', name: 'Customers', category: 'commercial', description: 'Manage customers' },
    { resource: 'suppliers', name: 'Suppliers', category: 'commercial', description: 'Manage suppliers' },
    { resource: 'supply_orders', name: 'Supply Orders', category: 'commercial', description: 'Manage supply orders' },
    { resource: 'products', name: 'Products', category: 'inventory', description: 'Manage products' },
    { resource: 'categories', name: 'Categories', category: 'inventory', description: 'Manage categories' },
    { resource: 'stock', name: 'Stock Management', category: 'inventory', description: 'Manage stock levels' },
    { resource: 'devices', name: 'Devices', category: 'maintenance', description: 'Manage devices' },
    { resource: 'maintenances', name: 'Maintenances', category: 'maintenance', description: 'Manage maintenance records' },
    { resource: 'subscriptions', name: 'Subscriptions', category: 'finance', description: 'Manage subscriptions' },
    { resource: 'services', name: 'Services & Offers', category: 'finance', description: 'Manage service offerings' },
    { resource: 'media', name: 'Media', category: 'content', description: 'Manage media files' },
    { resource: 'statistics', name: 'Statistics', category: 'analytics', description: 'View analytics' },
    { resource: 'settings', name: 'Settings', category: 'settings', description: 'Organization settings' },
    { resource: 'stores', name: 'Stores', category: 'settings', description: 'Manage stores' },
    { resource: 'billing', name: 'Billing & Plans', category: 'billing', description: 'Manage billing' },
    { resource: 'audit_logs', name: 'Audit Logs', category: 'audit', description: 'View audit logs' },
    { resource: 'user_analytics', name: 'User Analytics', category: 'audit', description: 'View user analytics' },
];

const managerPermissionResources = [
    'dashboard', 'sales', 'pos', 'customers', 'suppliers', 'supply_orders',
    'products', 'categories', 'stock', 'devices', 'maintenances',
    'subscriptions', 'services', 'media', 'statistics', 'settings', 'stores',
];

function loadConfig(): DesktopSeedConfig {
    const configPath =
        process.env.DESKTOP_SEED_CONFIG ||
        path.join(__dirname, 'desktop-seed.config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as DesktopSeedConfig;
}

function loadSqlitePrisma() {
    const clientPath = path.join(__dirname, '..', 'generated', 'sqlite-client');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require(clientPath);
    return new PrismaClient();
}

async function seedPermissions(prisma: any, organizationId: string) {
    for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
            where: { resource: perm.resource },
            update: {},
            create: perm,
        });
    }

    const allPermissions = await prisma.permission.findMany();
    const byResource = Object.fromEntries(allPermissions.map((p: any) => [p.resource, p.id]));

    for (const resource of managerPermissionResources) {
        const permissionId = byResource[resource];
        if (!permissionId) continue;
        await prisma.rolePermission.upsert({
            where: {
                organizationId_role_permissionId: {
                    organizationId,
                    role: 'MANAGER',
                    permissionId,
                },
            },
            update: {},
            create: { organizationId, role: 'MANAGER', permissionId },
        });
    }
    console.log('✅ Desktop permissions seeded');
}

async function main() {
    const config = loadConfig();
    const prisma = loadSqlitePrisma();

    console.log('🌱 Desktop seed starting...');
    console.log(`   Config: ${process.env.DESKTOP_SEED_CONFIG || 'desktop-seed.config.json'}`);

    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    const tables = (await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'`,
    )) as { name: string }[];
    for (const { name } of tables) {
        await prisma.$executeRawUnsafe(`DELETE FROM "${name}"`);
    }
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    console.log('✅ Cleared SQLite tables');

    const organization = await prisma.organization.create({
        data: {
            name: config.organization.name,
            address: config.organization.address,
            email: config.organization.email,
        },
    });

    const stores = [];
    for (const store of config.stores) {
        stores.push(
            await prisma.store.create({
                data: {
                    name: store.name,
                    address: store.address,
                    organizationId: organization.id,
                },
            }),
        );
    }

    for (const userCfg of config.users) {
        const passwordHash = await bcrypt.hash(userCfg.password, 10);
        const user = await prisma.user.create({
            data: {
                email: userCfg.email,
                passwordHash,
                firstName: userCfg.firstName,
                lastName: userCfg.lastName,
                role: userCfg.role,
                organizationId: organization.id,
            },
        });

        const indexes = userCfg.storeIndexes ?? [0];
        for (const idx of indexes) {
            const store = stores[idx];
            if (!store) continue;
            await prisma.userStore.create({
                data: { userId: user.id, storeId: store.id },
            });
        }
        console.log(`✅ User: ${userCfg.email} (${userCfg.role})`);
    }

    if (config.seedPermissions !== false) {
        await seedPermissions(prisma, organization.id);
    }

    console.log('');
    console.log('🎉 Desktop seed completed');
    console.log('📝 Login with users from desktop-seed.config.json');
    for (const u of config.users) {
        console.log(`   ${u.email} / ${u.password}`);
    }
}

main()
    .catch((e) => {
        console.error('❌ Desktop seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        try {
            const prisma = loadSqlitePrisma();
            await prisma.$disconnect();
        } catch {
            /* ignore */
        }
    });
