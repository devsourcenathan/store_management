import Dexie, { Table } from 'dexie';

// ============================================
// INTERFACES
// ============================================

export interface OfflineOperation {
    id?: number;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    data: any;
    clientId: string;
    timestamp: number;
    synced: number; // 0 for false, 1 for true (IndexedDB keys don't support booleans)
    error?: string;
}

export interface Store {
    id: string;
    name: string;
    address?: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    description?: string;
    categoryId?: string;
    organizationId: string;
    basePrice: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProductImage {
    id: string;
    productId: string;
    filename: string;
    url: string;
    isDefault: boolean;
    createdAt: string;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    parentId?: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    storeId: string;
    type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
    source: 'SALE' | 'SUPPLY' | 'RETURN' | 'MANUAL';
    quantity: number;
    reference?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
    syncedAt?: string;
    clientId?: string;
}

export interface SaleItem {
    id: string;
    saleId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

export interface Sale {
    id: string;
    storeId: string;
    customerId?: string;
    totalAmount: number;
    paidAmount: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
    notes?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    syncedAt?: string;
    clientId?: string;
    items: SaleItem[];
}

export interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    creditLimit: number;
    currentCredit: number;
    organizationId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    organizationId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Service {
    id: string;
    name: string;
    description?: string;
    provider: string;
    organizationId: string;
    isActive: boolean;
}

export interface SubscriptionAccount {
    id: string;
    serviceId: string;
    storeId: string;
    balance: number;
}

export interface SubscriptionBalanceEntry {
    id: string;
    accountId: string;
    type: 'DEBIT' | 'CREDIT';
    source: 'INJECTION' | 'SUBSCRIPTION' | 'REFUND' | 'CORRECTION';
    amount: number;
    reference?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
}

export interface SubscriptionOffer {
    id: string;
    serviceId: string;
    name: string;
    description?: string;
    basePrice: number;
    duration: number; // in days
    billingCycle: string;
    pricingRules?: any; // JSON
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionRenewal {
    id: string;
    subscriptionId: string;
    duration: number;
    price: number;
    balanceUsed: number;
    createdBy: string;
    createdAt: string;
    syncedAt?: string;
    clientId?: string;
}

export interface CustomerSubscription {
    id: string;
    customerId: string;
    offerId: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
    startDate: string;
    endDate?: string;
    autoRenew: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionBalanceAlert {
    id: string;
    accountId: string;
    type: 'NEGATIVE' | 'LOW_BALANCE';
    threshold?: number;
    currentBalance: number;
    resolved: boolean;
    resolvedBy?: string;
    resolvedAt?: string;
    createdAt: string;
}

// ============================================
// DATABASE CLASS
// ============================================

export class OfflineDB extends Dexie {
    operations!: Table<OfflineOperation>;
    products!: Table<Product>;
    productImages!: Table<ProductImage>;
    categories!: Table<Category>;
    stockMovements!: Table<StockMovement>;
    sales!: Table<Sale>;
    customers!: Table<Customer>;
    suppliers!: Table<Supplier>;
    storesTable!: Table<Store>;
    services!: Table<Service>;
    subscriptionAccounts!: Table<SubscriptionAccount>;
    subscriptionBalanceEntries!: Table<SubscriptionBalanceEntry>;
    subscriptionOffers!: Table<SubscriptionOffer>;
    subscriptionRenewals!: Table<SubscriptionRenewal>;
    customerSubscriptions!: Table<CustomerSubscription>;
    subscriptionBalanceAlerts!: Table<SubscriptionBalanceAlert>;

    constructor() {
        super('StockManagementDB');

        this.version(4).stores({
            operations: '++id, entity, synced, timestamp',
            products: 'id, organizationId, sku, name, categoryId',
            productImages: 'id, productId',
            categories: 'id, organizationId, name, parentId',
            stockMovements: 'id, productId, storeId, createdAt, clientId',
            sales: 'id, storeId, customerId, createdAt, clientId',
            customers: 'id, organizationId, name',
            suppliers: 'id, organizationId, name',
            storesTable: 'id, organizationId, name',
            services: 'id, organizationId, name',
            subscriptionAccounts: 'id, serviceId, storeId',
            subscriptionBalanceEntries: 'id, accountId, createdAt',
            subscriptionOffers: 'id, serviceId, name',
            subscriptionRenewals: 'id, subscriptionId, createdAt, clientId',
            customerSubscriptions: 'id, customerId, offerId, status',
            subscriptionBalanceAlerts: 'id, accountId, resolved',
        });
    }

    async clearAll() {
        await this.operations.clear();
        await this.products.clear();
        await this.productImages.clear();
        await this.categories.clear();
        await this.stockMovements.clear();
        await this.sales.clear();
        await this.customers.clear();
        await this.suppliers.clear();
        await this.storesTable.clear();
        await this.services.clear();
        await this.subscriptionAccounts.clear();
        await this.subscriptionBalanceEntries.clear();
        await this.subscriptionOffers.clear();
        await this.subscriptionRenewals.clear();
        await this.customerSubscriptions.clear();
        await this.subscriptionBalanceAlerts.clear();
    }
}

export const db = new OfflineDB();
