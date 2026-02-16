import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPermissions = [
    // Overview
    { resource: 'dashboard', name: 'Dashboard', category: 'overview', description: 'Access to main dashboard' },

    // Commercial
    { resource: 'sales', name: 'Sales History', category: 'commercial', description: 'View and manage sales' },
    { resource: 'pos', name: 'Point of Sale', category: 'commercial', description: 'Access POS system' },
    { resource: 'customers', name: 'Customers', category: 'commercial', description: 'Manage customers' },
    { resource: 'suppliers', name: 'Suppliers', category: 'commercial', description: 'Manage suppliers' },
    { resource: 'supply_orders', name: 'Supply Orders', category: 'commercial', description: 'Manage supply orders' },

    // Inventory
    { resource: 'products', name: 'Products', category: 'inventory', description: 'Manage products' },
    { resource: 'categories', name: 'Categories', category: 'inventory', description: 'Manage categories' },
    { resource: 'stock', name: 'Stock Management', category: 'inventory', description: 'Manage stock levels' },

    // Maintenance
    { resource: 'devices', name: 'Devices', category: 'maintenance', description: 'Manage devices' },
    { resource: 'maintenances', name: 'Maintenances', category: 'maintenance', description: 'Manage maintenance records' },

    // Finance
    { resource: 'subscriptions', name: 'Subscriptions', category: 'finance', description: 'Manage subscriptions' },
    { resource: 'services', name: 'Services & Offers', category: 'finance', description: 'Manage service offerings' },

    // Content
    { resource: 'media', name: 'Media', category: 'content', description: 'Manage media files' },

    // Analytics
    { resource: 'statistics', name: 'Statistics', category: 'analytics', description: 'View analytics and statistics' },

    // Settings
    { resource: 'settings', name: 'Settings', category: 'settings', description: 'Access organization settings' },
    { resource: 'stores', name: 'Stores', category: 'settings', description: 'Manage stores' },

    // Billing (OWNER only)
    { resource: 'billing', name: 'Billing & Plans', category: 'billing', description: 'Manage billing and subscription plans' },

    // Audit & Analytics
    { resource: 'audit_logs', name: 'Audit Logs', category: 'audit', description: 'View audit logs' },
    { resource: 'user_analytics', name: 'User Analytics', category: 'audit', description: 'View user analytics' },
];

// Default permissions for MANAGER role
const managerPermissions = [
    'dashboard', 'sales', 'pos', 'customers', 'suppliers', 'supply_orders',
    'products', 'categories', 'stock', 'devices', 'maintenances',
    'subscriptions', 'services', 'media', 'settings', 'stores',
    'audit_logs', 'user_analytics'
];

// Default permissions for STAFF role
const staffPermissions = [
    'dashboard', 'sales', 'pos', 'customers',
    'products', 'stock', 'devices', 'maintenances'
];

async function seedPermissions() {
    console.log('🌱 Seeding permissions...');

    // Create all permissions
    for (const permission of defaultPermissions) {
        await prisma.permission.upsert({
            where: { resource: permission.resource },
            update: permission,
            create: permission,
        });
    }

    console.log(`✅ Created ${defaultPermissions.length} permissions`);

    // Get all organizations
    const organizations = await prisma.organization.findMany();

    for (const org of organizations) {
        console.log(`\n📦 Setting up permissions for organization: ${org.name}`);

        // Get all permissions
        const allPermissions = await prisma.permission.findMany();

        // Create MANAGER role permissions
        for (const permission of allPermissions) {
            if (managerPermissions.includes(permission.resource)) {
                await prisma.rolePermission.upsert({
                    where: {
                        organizationId_role_permissionId: {
                            organizationId: org.id,
                            role: 'MANAGER',
                            permissionId: permission.id,
                        },
                    },
                    update: { canAccess: true },
                    create: {
                        organizationId: org.id,
                        role: 'MANAGER',
                        permissionId: permission.id,
                        canAccess: true,
                    },
                });
            }
        }

        // Create STAFF role permissions
        for (const permission of allPermissions) {
            if (staffPermissions.includes(permission.resource)) {
                await prisma.rolePermission.upsert({
                    where: {
                        organizationId_role_permissionId: {
                            organizationId: org.id,
                            role: 'STAFF',
                            permissionId: permission.id,
                        },
                    },
                    update: { canAccess: true },
                    create: {
                        organizationId: org.id,
                        role: 'STAFF',
                        permissionId: permission.id,
                        canAccess: true,
                    },
                });
            }
        }

        console.log(`✅ MANAGER: ${managerPermissions.length} permissions`);
        console.log(`✅ STAFF: ${staffPermissions.length} permissions`);
    }

    console.log('\n✨ Permission seeding completed!');
}

seedPermissions()
    .catch((e) => {
        console.error('❌ Error seeding permissions:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
