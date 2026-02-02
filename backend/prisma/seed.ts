import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Clear existing data (in development only)
    await prisma.auditLog.deleteMany();
    await prisma.syncMetadata.deleteMany();
    await prisma.subscriptionBalanceEntry.deleteMany();
    await prisma.customerSubscription.deleteMany();
    await prisma.subscriptionOption.deleteMany();
    await prisma.subscriptionOffer.deleteMany();
    await prisma.service.deleteMany();
    await prisma.supplierBalanceEntry.deleteMany();
    await prisma.supplyItem.deleteMany();
    await prisma.supply.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.stockAlert.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.pricingRule.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.userStore.deleteMany();
    await prisma.user.deleteMany();
    await prisma.store.deleteMany();
    await prisma.organization.deleteMany();

    console.log('✅ Cleared existing data');

    // Create Organization
    const organization = await prisma.organization.create({
        data: {
            name: 'Demo Company',
        },
    });
    console.log('✅ Created organization:', organization.name);

    // Create Stores
    const store1 = await prisma.store.create({
        data: {
            name: 'Main Store',
            address: '123 Main Street, City',
            organizationId: organization.id,
        },
    });

    const store2 = await prisma.store.create({
        data: {
            name: 'Branch Store',
            address: '456 Branch Avenue, City',
            organizationId: organization.id,
        },
    });
    console.log('✅ Created stores:', store1.name, store2.name);

    // Create Users
    const passwordHash = await bcrypt.hash('Sekuu@13', 10);

    const owner = await prisma.user.create({
        data: {
            email: 'owner@demo.com',
            passwordHash,
            firstName: 'John',
            lastName: 'Owner',
            role: UserRole.OWNER,
            organizationId: organization.id,
        },
    });

    const manager = await prisma.user.create({
        data: {
            email: 'manager@demo.com',
            passwordHash,
            firstName: 'Jane',
            lastName: 'Manager',
            role: UserRole.MANAGER,
            organizationId: organization.id,
        },
    });

    const staff = await prisma.user.create({
        data: {
            email: 'staff@demo.com',
            passwordHash,
            firstName: 'Bob',
            lastName: 'Staff',
            role: UserRole.STAFF,
            organizationId: organization.id,
        },
    });

    const admin = await prisma.user.create({
        data: {
            email: 'admin@prod.com',
            passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            role: UserRole.GLOBAL_ADMIN,
            organizationId: organization.id,
        },
    });
    console.log('✅ Created users: owner, manager, staff, admin');

    // Assign users to stores
    await prisma.userStore.createMany({
        data: [
            { userId: owner.id, storeId: store1.id },
            { userId: owner.id, storeId: store2.id },
            { userId: manager.id, storeId: store1.id },
            { userId: staff.id, storeId: store1.id },
        ],
    });
    console.log('✅ Assigned users to stores');

    // Create Categories
    const electronics = await prisma.category.create({
        data: {
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            organizationId: organization.id,
        },
    });

    const clothing = await prisma.category.create({
        data: {
            name: 'Clothing',
            description: 'Apparel and fashion items',
            organizationId: organization.id,
        },
    });

    const food = await prisma.category.create({
        data: {
            name: 'Food & Beverages',
            description: 'Food and drink items',
            organizationId: organization.id,
        },
    });
    console.log('✅ Created categories');

    // Create Products
    const products = await prisma.product.createMany({
        data: [
            {
                name: 'Laptop',
                sku: 'ELEC-001',
                description: 'High-performance laptop',
                categoryId: electronics.id,
                organizationId: organization.id,
                basePrice: 999.99,
            },
            {
                name: 'Smartphone',
                sku: 'ELEC-002',
                description: 'Latest smartphone model',
                categoryId: electronics.id,
                organizationId: organization.id,
                basePrice: 699.99,
            },
            {
                name: 'T-Shirt',
                sku: 'CLTH-001',
                description: 'Cotton t-shirt',
                categoryId: clothing.id,
                organizationId: organization.id,
                basePrice: 19.99,
            },
            {
                name: 'Jeans',
                sku: 'CLTH-002',
                description: 'Denim jeans',
                categoryId: clothing.id,
                organizationId: organization.id,
                basePrice: 49.99,
            },
            {
                name: 'Coffee',
                sku: 'FOOD-001',
                description: 'Premium coffee beans',
                categoryId: food.id,
                organizationId: organization.id,
                basePrice: 12.99,
            },
        ],
    });
    console.log('✅ Created products');

    // Get created products for stock movements
    const laptop = await prisma.product.findFirst({
        where: { sku: 'ELEC-001' },
    });
    const smartphone = await prisma.product.findFirst({
        where: { sku: 'ELEC-002' },
    });
    const tshirt = await prisma.product.findFirst({
        where: { sku: 'CLTH-001' },
    });

    // Create Stock Movements (Append-only)
    await prisma.stockMovement.createMany({
        data: [
            // Initial stock for store 1
            {
                productId: laptop!.id,
                storeId: store1.id,
                type: 'IN',
                source: 'MANUAL',
                quantity: 50,
                reference: 'INIT-001',
                notes: 'Initial stock',
                createdBy: owner.id,
            },
            {
                productId: smartphone!.id,
                storeId: store1.id,
                type: 'IN',
                source: 'MANUAL',
                quantity: 100,
                reference: 'INIT-002',
                notes: 'Initial stock',
                createdBy: owner.id,
            },
            {
                productId: tshirt!.id,
                storeId: store1.id,
                type: 'IN',
                source: 'MANUAL',
                quantity: 200,
                reference: 'INIT-003',
                notes: 'Initial stock',
                createdBy: owner.id,
            },
            // Some sales movements
            {
                productId: laptop!.id,
                storeId: store1.id,
                type: 'SALE',
                source: 'SALE',
                quantity: 5,
                reference: 'SALE-001',
                notes: 'Sales',
                createdBy: staff.id,
            },
            {
                productId: smartphone!.id,
                storeId: store1.id,
                type: 'SALE',
                source: 'SALE',
                quantity: 10,
                reference: 'SALE-002',
                notes: 'Sales',
                createdBy: staff.id,
            },
        ],
    });
    console.log('✅ Created stock movements');

    // Create Customers
    const customer1 = await prisma.customer.create({
        data: {
            name: 'Alice Johnson',
            email: 'alice@example.com',
            phone: '+1234567890',
            address: '789 Customer St, City',
            creditLimit: 5000,
            currentCredit: 0,
            organizationId: organization.id,
        },
    });

    const customer2 = await prisma.customer.create({
        data: {
            name: 'Bob Smith',
            email: 'bob@example.com',
            phone: '+1234567891',
            creditLimit: 3000,
            currentCredit: 500,
            organizationId: organization.id,
        },
    });
    console.log('✅ Created customers');

    // Create Sales
    const sale1 = await prisma.sale.create({
        data: {
            storeId: store1.id,
            customerId: customer1.id,
            totalAmount: 1699.98,
            paidAmount: 1699.98,
            status: 'PAID',
            createdBy: staff.id,
            items: {
                create: [
                    {
                        productId: laptop!.id,
                        quantity: 1,
                        unitPrice: 999.99,
                        discount: 0,
                        total: 999.99,
                    },
                    {
                        productId: smartphone!.id,
                        quantity: 1,
                        unitPrice: 699.99,
                        discount: 0,
                        total: 699.99,
                    },
                ],
            },
            payments: {
                create: [
                    {
                        amount: 1699.98,
                        method: 'CARD',
                        reference: 'CARD-12345',
                        createdBy: staff.id,
                    },
                ],
            },
        },
    });

    const sale2 = await prisma.sale.create({
        data: {
            storeId: store1.id,
            customerId: customer2.id,
            totalAmount: 69.98,
            paidAmount: 50,
            status: 'PARTIAL',
            createdBy: staff.id,
            items: {
                create: [
                    {
                        productId: tshirt!.id,
                        quantity: 2,
                        unitPrice: 19.99,
                        discount: 0,
                        total: 39.98,
                    },
                    {
                        productId: tshirt!.id,
                        quantity: 1,
                        unitPrice: 19.99,
                        discount: 0,
                        total: 19.99,
                    },
                ],
            },
            payments: {
                create: [
                    {
                        amount: 50,
                        method: 'CASH',
                        createdBy: staff.id,
                    },
                ],
            },
        },
    });
    console.log('✅ Created sales');

    // Create Suppliers
    const supplier = await prisma.supplier.create({
        data: {
            name: 'Tech Supplies Inc',
            email: 'sales@techsupplies.com',
            phone: '+1234567892',
            address: '100 Supplier Blvd, City',
            organizationId: organization.id,
        },
    });
    console.log('✅ Created supplier');

    // TODO: Fix subscription offer creation - has TypeScript errors
    /*
    // Create Services for Subscriptions
    const service = await prisma.service.create({
        data: {
            name: 'Cloud Storage',
            description: 'Cloud storage service',
            provider: 'CloudProvider Inc',
            organizationId: organization.id,
        },
    });

    // Create Subscription Offers
    const offer = await prisma.subscriptionOffer.create({
        data: {
            serviceId: service.id,
            name: 'Basic Plan',
            description: '100GB storage',
            basePrice: 9.99,
            billingCycle: 'MONTHLY',
            pricingRules: {
                type: 'tiered',
                tiers: [
                    { min: 1, max: 10, discount: 0 },
                    { min: 11, max: 50, discount: 0.1 },
                    { min: 51, max: null, discount: 0.2 },
                ],
            },
            options: {
                create: [
                    {
                        name: 'Extra Storage',
                        description: '+50GB',
                        price: 4.99,
                    },
                    {
                        name: 'Priority Support',
                        description: '24/7 support',
                        price: 9.99,
                    },
                ],
            },
        },
    });
    console.log('✅ Created subscription service and offers');

    // Create Customer Subscription
    await prisma.customerSubscription.create({
        data: {
            customerId: customer1.id,
            offerId: offer.id,
            status: 'ACTIVE',
            startDate: new Date(),
            autoRenew: true,
        },
    });
    console.log('✅ Created customer subscription');
    */


    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('');
    console.log('📝 Test credentials:');
    console.log('   Global Admin: admin@demo.com / password123');
    console.log('   Owner:        owner@demo.com / password123');
    console.log('   Manager:      manager@demo.com / password123');
    console.log('   Staff:        staff@demo.com / password123');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
