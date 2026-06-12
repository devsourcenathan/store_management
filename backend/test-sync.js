const { PrismaClient } = require('./generated/sqlite-client');
const axios = require('axios');
const prisma = new PrismaClient({ datasources: { db: { url: "file:C:\\Users\\nathan.tchinda\\AppData\\Roaming\\StockManagement\\stock.db" } } });

async function testSync() {
    const config = await prisma.desktopConfig.findFirst();
    if (!config) {
        console.log("No config");
        return;
    }

    try {
        const pullUrl = `${config.remoteUrl}/sync/initial`;
        const headers = { Authorization: `Bearer ${config.syncToken}`, 'x-client-id': config.clientId };
        const pullRes = await axios.get(pullUrl, { headers });
        const data = pullRes.data;

        console.log("Fetched initial data. Testing upsert...");

        const upsertMany = async (modelName, items) => {
            if (!items || items.length === 0) return;
            const model = prisma[modelName];
            if (!model) {
                throw new Error(`Model ${modelName} not found on Prisma Client`);
            }
            for (const item of items) {
                await model.upsert({ where: { id: item.id }, update: item, create: item });
            }
        };

        if (data.organization) {
            console.log("Upserting org...");
            await prisma.organization.upsert({ where: { id: data.organization.id }, update: data.organization, create: data.organization });
        }
        
        console.log("Upserting users...");
        await upsertMany('user', data.users);
        console.log("Upserting stores...");
        await upsertMany('store', data.stores);
        
        console.log("Upserting userStores...");
        if (data.userStores && data.userStores.length > 0) {
            await prisma.userStore.deleteMany({});
            await prisma.userStore.createMany({ data: data.userStores });
        } else if (!data.userStores && data.users && data.stores) {
            const userStoresToCreate = [];
            for (const u of data.users) {
                for (const s of data.stores) {
                    userStoresToCreate.push({ userId: u.id, storeId: s.id });
                }
            }
            await prisma.userStore.deleteMany({});
            await prisma.userStore.createMany({ data: userStoresToCreate });
        }

        console.log("Upserting categories...");
        await upsertMany('category', data.categories);
        console.log("Upserting permissions...");
        await upsertMany('permission', data.permissions);
        console.log("Upserting rolePermissions...");
        await upsertMany('rolePermission', data.rolePermissions);
        console.log("Upserting userPermissions...");
        await upsertMany('userPermission', data.userPermissions);
        
        console.log("Upserting products...");
        for (const p of data.products || []) {
            const { images, ...productData } = p;
            await prisma.product.upsert({ where: { id: p.id }, update: productData, create: productData });
        }

        console.log("Upserting customers...");
        await upsertMany('customer', data.customers);
        console.log("Upserting suppliers...");
        await upsertMany('supplier', data.suppliers);
        console.log("Upserting services...");
        await upsertMany('service', data.services);
        
        console.log("Upserting sales...");
        const users = data.users || [];
        const userIds = new Set(users.map((u) => u.id));
        const fallbackUserId = users.find((u) => u.role === 'OWNER')?.id || (users.length > 0 ? users[0].id : null);

        for (const s of data.sales || []) {
            const { items, payments, ...saleData } = s;
            
            if (saleData.createdBy && !userIds.has(saleData.createdBy)) {
                saleData.createdBy = fallbackUserId;
            }
            if (saleData.customerId && !data.customers?.some((c) => c.id === saleData.customerId)) {
                saleData.customerId = null;
            }
            if (!saleData.createdBy) {
                continue;
            }
            await prisma.sale.upsert({ where: { id: s.id }, update: saleData, create: saleData });
            await upsertMany('saleItem', items);
            await upsertMany('payment', payments);
        }
        
        console.log("Upserting stockMovements...");
        await upsertMany('stockMovement', data.stockMovements);
        console.log("Upserting media...");
        await upsertMany('media', data.media);
        console.log("Upserting auditLog...");
        await upsertMany('auditLog', data.auditLogs);
        
        console.log("Upserting supplies...");
        for (const s of data.supplies || []) {
            const { items, ...supplyData } = s;
            await prisma.supply.upsert({ where: { id: s.id }, update: supplyData, create: supplyData });
            await upsertMany('supplyItem', items);
        }
        console.log("Upserting supplierBalanceEntries...");
        await upsertMany('supplierBalanceEntry', data.supplierBalanceEntries);

        console.log("Upserting devices...");
        await upsertMany('device', data.devices);
        console.log("Upserting maintenances...");
        for (const m of data.maintenances || []) {
            const { parts, invoice, ...maintenanceData } = m;
            await prisma.maintenance.upsert({ where: { id: m.id }, update: maintenanceData, create: maintenanceData });
            await upsertMany('maintenancePart', parts);
            if (invoice) {
                await prisma.maintenanceInvoice.upsert({ where: { id: invoice.id }, update: invoice, create: invoice });
            }
        }

        console.log("Upserting creditContracts...");
        for (const c of data.creditContracts || []) {
            const { payments, ...contractData } = c;
            await prisma.creditContract.upsert({ where: { id: c.id }, update: contractData, create: contractData });
            await upsertMany('creditPayment', payments);
        }

        console.log("Upserting subscriptionOffers...");
        for (const o of data.subscriptionOffers || []) {
            const { options, ...offerData } = o;
            await prisma.subscriptionOffer.upsert({ where: { id: o.id }, update: offerData, create: offerData });
            await upsertMany('subscriptionOption', options);
        }
        
        console.log("Upserting customerSubscriptions...");
        for (const s of data.customerSubscriptions || []) {
            const { options, renewals, ...subData } = s;
            await prisma.customerSubscription.upsert({ 
                where: { id: s.id }, 
                update: { ...subData, options: { set: options?.map((o) => ({ id: o.id })) || [] } }, 
                create: { ...subData, options: { connect: options?.map((o) => ({ id: o.id })) || [] } } 
            });
            await upsertMany('subscriptionRenewal', renewals);
        }
        
        console.log("Upserting subscriptionAccounts...");
        for (const a of data.subscriptionAccounts || []) {
            const { balanceEntries, alerts, ...accountData } = a;
            await prisma.subscriptionAccount.upsert({ where: { id: a.id }, update: accountData, create: accountData });
            await upsertMany('subscriptionBalanceEntry', balanceEntries);
            await upsertMany('subscriptionBalanceAlert', alerts);
        }

        console.log("Upserting pricingRules...");
        await upsertMany('pricingRule', data.pricingRules);

        console.log("All done successfully!");
    } catch (error) {
        console.error("Test failed with error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testSync();
