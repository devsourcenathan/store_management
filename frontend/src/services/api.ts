import axios from 'axios';

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

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            // Show forbidden error
            // We need to import toast dynamically or use a custom event because we are outside React context
            // But since this file is imported in React components, we can export an event emitter or just try to use sonner if it supports external calls
            // For now, let's just reject, and components using useQuery will catch it.
            // ACTUALLY, usually we want a global toast.
            // Let's assume we can throw a specific error that the query client global error handler can catch, 
            // or just use window.dispatchEvent if we want to be decoupled
            console.error('Access verification failed', error);
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
        const response = await api.get('/products', {
            params: { organizationId },
        });
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/products', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.patch(`/products/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/products/${id}`);
        return response.data;
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
        const response = await api.get('/stock/movements', {
            params: { storeId, productId },
        });
        return response.data;
    },

    createMovement: async (data: any) => {
        const response = await api.post('/stock/movements', data);
        return response.data;
    },

    getCurrentStock: async (storeId: string, productId: string) => {
        const response = await api.get('/stock/current', {
            params: { storeId, productId },
        });
        return response.data;
    },
};

// ============================================
// SALES API
// ============================================

export const salesApi = {
    getAll: async (storeId: string) => {
        const response = await api.get('/sales', {
            params: { storeId },
        });
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/sales', data);
        return response.data;
    },

    addPayment: async (saleId: string, data: any) => {
        const response = await api.post(`/sales/${saleId}/payments`, data);
        return response.data;
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
