import axios from 'axios';
import { saveOffline, deleteOffline, withOfflineFallback, extractEntityFromUrl, getTableForEntity } from '@/offline/offlineOperations';
import { db } from '@/offline/db';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

import { toast } from 'sonner';

// Response interceptor for error handling and offline support
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle offline/network errors
        if (!error.response && (error.code === 'ERR_NETWORK' || !navigator.onLine)) {
            const config = error.config;
            const url = config.url || '';

            // Skip offline handling for user management endpoints (sensitive operations)
            if (url.includes('/users/') || url.includes('/auth/')) {
                toast.error('No internet connection. User management requires online access.');
                return Promise.reject(error);
            }

            // Only handle write operations (POST, PATCH, PUT, DELETE)
            if (['post', 'patch', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
                try {
                    // Extract entity from URL
                    const entity = extractEntityFromUrl(url);
                    const data = config.data ? JSON.parse(config.data) : {};

                    let savedData: any;

                    // Save offline based on method
                    if (config.method?.toLowerCase() === 'post') {
                        savedData = await saveOffline(entity, data, false);
                        toast.success('Saved offline. Will sync when online.');
                    } else if (config.method?.toLowerCase() === 'patch' || config.method?.toLowerCase() === 'put') {
                        savedData = await saveOffline(entity, data, true);
                        toast.success('Updated offline. Will sync when online.');
                    } else if (config.method?.toLowerCase() === 'delete') {
                        const id = url.split('/').pop();
                        if (id) {
                            await deleteOffline(entity, id);
                            savedData = { success: true };
                            toast.success('Deleted offline. Will sync when online.');
                        }
                    }

                    // Return a complete axios response object
                    return Promise.resolve({
                        data: savedData,
                        status: 200,
                        statusText: 'OK',
                        headers: {},
                        config: config,
                    });
                } catch (offlineError) {
                    console.error('Offline save failed:', offlineError);
                    toast.error('Failed to save offline');
                    return Promise.reject(offlineError);
                }
            } else {
                // For read operations, try to get from IndexedDB
                try {
                    const entity = extractEntityFromUrl(url);
                    const table = getTableForEntity(entity);

                    if (table) {
                        const data = await table.toArray();
                        toast.info('Showing offline data');

                        // Return a complete axios response object
                        return Promise.resolve({
                            data: data,
                            status: 200,
                            statusText: 'OK',
                            headers: {},
                            config: config,
                        });
                    }
                } catch (readError) {
                    console.error('Offline read failed:', readError);
                }
            }

            toast.error('No internet connection');
            return Promise.reject(error);
        }

        // Handle HTTP errors
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        } else if (error.response?.status === 403) {
            toast.error('Access Denied: You do not have permission to perform this action.');
        } else if (error.response?.status === 400) {
            const message = error.response.data?.message;
            if (Array.isArray(message)) {
                // NestJS class-validator returns an array of errors
                message.forEach((msg) => toast.error(msg));
            } else if (typeof message === 'string') {
                toast.error(message);
            } else {
                toast.error('Validation Error: Please check your input.');
            }
        } else if (error.response?.status >= 500) {
            toast.error('Server Error: Something went wrong. Please try again later.');
        }

        return Promise.reject(error);
    }
);

// ============================================
// AUTH API
// ============================================

export const authApi = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        organizationName: string;
    }) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

// ============================================
// PRODUCTS API
// ============================================

export const productsApi = {
    getAll: async (organizationId: string) => {
        return withOfflineFallback(
            async () => {
                const response = await api.get('/products', {
                    params: { organizationId },
                });
                return response.data;
            },
            async () => {
                // Fallback: get from IndexedDB
                const products = await db.products
                    .where('organizationId')
                    .equals(organizationId)
                    .toArray();
                return products;
            }
        );
    },

    getOne: async (id: string) => {
        return withOfflineFallback(
            async () => {
                const response = await api.get(`/products/${id}`);
                return response.data;
            },
            async () => {
                // Fallback: get from IndexedDB
                return await db.products.get(id);
            }
        );
    },

    create: async (data: any) => {
        return withOfflineFallback(
            async () => {
                const response = await api.post('/products', data);
                return response.data;
            },
            async () => {
                // Fallback: save locally and queue for sync
                return await saveOffline('products', data, false);
            }
        );
    },

    update: async (id: string, data: any) => {
        return withOfflineFallback(
            async () => {
                const response = await api.patch(`/products/${id}`, data);
                return response.data;
            },
            async () => {
                // Fallback: update locally and queue for sync
                return await saveOffline('products', { ...data, id }, true);
            }
        );
    },

    delete: async (id: string) => {
        return withOfflineFallback(
            async () => {
                const response = await api.delete(`/products/${id}`);
                return response.data;
            },
            async () => {
                // Fallback: delete locally and queue for sync
                await deleteOffline('products', id);
                return { success: true };
            }
        );
    },
};

// ============================================
// CATEGORIES API
// ============================================

export const categoriesApi = {
    getAll: async () => {
        const response = await api.get('/categories');
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/categories', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.patch(`/categories/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    },
};

// ============================================
// STOCK API
// ============================================

export const stockApi = {
    getMovements: async (storeId: string, productId?: string) => {
        return withOfflineFallback(
            async () => {
                const response = await api.get('/stock/movements', {
                    params: { storeId, productId },
                });
                return response.data;
            },
            async () => {
                // Fallback: get from IndexedDB
                let query = db.stockMovements.where('storeId').equals(storeId);
                if (productId) {
                    const movements = await query.toArray();
                    return movements.filter(m => m.productId === productId);
                }
                return await query.toArray();
            }
        );
    },

    createMovement: async (data: any) => {
        return withOfflineFallback(
            async () => {
                const response = await api.post('/stock/movements', data);
                return response.data;
            },
            async () => {
                // Fallback: save locally and queue for sync
                return await saveOffline('stockMovements', data, false);
            }
        );
    },

    getCurrentStock: async (storeId: string, productId: string) => {
        return withOfflineFallback(
            async () => {
                const response = await api.get('/stock/current', {
                    params: { storeId, productId },
                });
                return response.data;
            },
            async () => {
                // Fallback: calculate from local movements
                const movements = await db.stockMovements
                    .where('storeId')
                    .equals(storeId)
                    .toArray();

                const productMovements = movements.filter(m => m.productId === productId);
                const quantity = productMovements.reduce((sum, m) => sum + m.quantity, 0);

                return { productId, storeId, quantity };
            }
        );
    },
};

// ============================================
// SALES API
// ============================================

export const salesApi = {
    getAll: async (storeId: string) => {
        return withOfflineFallback(
            async () => {
                const response = await api.get('/sales', {
                    params: { storeId },
                });
                return response.data;
            },
            async () => {
                // Fallback: get from IndexedDB
                const sales = await db.sales
                    .where('storeId')
                    .equals(storeId)
                    .toArray();
                return sales;
            }
        );
    },

    create: async (data: any) => {
        return withOfflineFallback(
            async () => {
                const response = await api.post('/sales', data);
                return response.data;
            },
            async () => {
                // Fallback: save locally and queue for sync
                const sale = await saveOffline('sales', data, false);

                // Also create stock movements locally
                if (data.items && Array.isArray(data.items)) {
                    for (const item of data.items) {
                        const stockMovement = {
                            productId: item.productId,
                            storeId: data.storeId,
                            type: 'OUT',
                            source: 'SALE',
                            quantity: -item.quantity,
                            reference: sale.id,
                            createdBy: data.createdBy,
                            createdAt: new Date().toISOString(),
                            clientId: sale.id,
                        };
                        await saveOffline('stockMovements', stockMovement, false);
                    }
                }

                return sale;
            }
        );
    },

    addPayment: async (saleId: string, data: any) => {
        return withOfflineFallback(
            async () => {
                const response = await api.post(`/sales/${saleId}/payments`, data);
                return response.data;
            },
            async () => {
                // Fallback: update sale locally
                const sale = await db.sales.get(saleId);
                if (sale) {
                    sale.paidAmount = (sale.paidAmount || 0) + data.amount;
                    if (sale.paidAmount >= sale.totalAmount) {
                        sale.status = 'PAID';
                    } else if (sale.paidAmount > 0) {
                        sale.status = 'PARTIAL';
                    }
                    await saveOffline('sales', sale, true);
                }
                return { success: true };
            }
        );
    },
};

// ============================================
// SUPPLIERS API
// ============================================

export const suppliersApi = {
    getAll: async () => {
        const response = await api.get('/suppliers');
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/suppliers', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.patch(`/suppliers/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/suppliers/${id}`);
        return response.data;
    },
};

// ============================================
// SYNC API
// ============================================

export const syncApi = {
    push: async (operations: any[]) => {
        const response = await api.post('/sync/push', { operations });
        return response.data;
    },

    pull: async (since: string) => {
        const response = await api.get('/sync/pull', {
            params: { since },
        });
        return response.data;
    },
};

// ============================================
// BILLING API
// ============================================

export interface PlatformPlan {
    id: string;
    name: string;
    type: 'FREE' | 'PRO' | 'BUSINESS';
    monthlyPrice: number;
    semiAnnualPrice: number;
    annualPrice: number;
    maxStores: number | null;
    maxProducts: number | null;
    maxUsers: number | null;
    features: Record<string, any> | null;
    trialDays: number;
    isActive: boolean;
}

export interface OrganizationSubscription {
    id: string;
    organizationId: string;
    planId: string;
    status: 'TRIALING' | 'ACTIVE' | 'LIFETIME' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
    billingCycle: 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL' | null;
    isLifetime: boolean;
    hideBillingUI: boolean;
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    plan: PlatformPlan;
}

export interface BillingInvoice {
    id: string;
    invoiceNumber: string;
    amount: number;
    discount: number;
    finalAmount: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    dueDate: string;
    paidAt: string | null;
    paymentUrl: string | null;
    createdAt: string;
}

export const billingApi = {
    // Public
    getPlans: async (): Promise<PlatformPlan[]> => {
        const response = await api.get('/billing/plans');
        return response.data;
    },

    getConfig: async () => {
        const response = await api.get('/billing/config');
        return response.data;
    },

    // Authenticated
    getSubscription: async (): Promise<OrganizationSubscription | null> => {
        const response = await api.get('/billing/subscription');
        return response.data;
    },

    subscribe: async (planId: string, billingCycle: 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL', callback?: string) => {
        const params = callback ? { callback } : {};
        const response = await api.post('/billing/subscribe', { planId, billingCycle }, { params });
        return response.data;
    },

    getInvoices: async (): Promise<BillingInvoice[]> => {
        const response = await api.get('/billing/invoices');
        return response.data;
    },

    getInvoice: async (id: string): Promise<BillingInvoice> => {
        const response = await api.get(`/billing/invoices/${id}`);
        return response.data;
    },

    handleCallback: async (reference: string) => {
        const response = await api.get('/billing/callback', { params: { reference } });
        return response.data;
    },
};

// ============================================
// ADMIN BILLING API
// ============================================

export const adminBillingApi = {
    // Plans
    getPlans: async (includeInactive = false): Promise<PlatformPlan[]> => {
        const response = await api.get('/admin/billing/plans', { params: { includeInactive } });
        return response.data;
    },

    getPlan: async (id: string): Promise<PlatformPlan> => {
        const response = await api.get(`/admin/billing/plans/${id}`);
        return response.data;
    },

    createPlan: async (data: Partial<PlatformPlan>) => {
        const response = await api.post('/admin/billing/plans', data);
        return response.data;
    },

    updatePlan: async (id: string, data: Partial<PlatformPlan>) => {
        const response = await api.patch(`/admin/billing/plans/${id}`, data);
        return response.data;
    },

    deletePlan: async (id: string) => {
        const response = await api.delete(`/admin/billing/plans/${id}`);
        return response.data;
    },

    // Subscriptions
    getSubscriptions: async () => {
        const response = await api.get('/admin/billing/subscriptions');
        return response.data;
    },

    assignSubscription: async (data: {
        organizationId: string;
        planId: string;
        billingCycle?: 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
        isLifetime?: boolean;
        hideBillingUI?: boolean;
    }) => {
        const response = await api.post('/admin/billing/subscriptions/assign', data);
        return response.data;
    },

    updateSubscription: async (id: string, data: {
        planId?: string;
        billingCycle?: 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
        isLifetime?: boolean;
        hideBillingUI?: boolean;
        extendDays?: number;
    }) => {
        const response = await api.patch(`/admin/billing/subscriptions/${id}`, data);
        return response.data;
    },

    cancelSubscription: async (id: string) => {
        const response = await api.delete(`/admin/billing/subscriptions/${id}`);
        return response.data;
    },
};

