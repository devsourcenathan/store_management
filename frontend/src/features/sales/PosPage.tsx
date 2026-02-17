import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Media } from '@/services/mediaService';
import { useStore } from '../stores/StoreProvider';
import { useSync } from '@/offline/SyncProvider';
import { saveOffline } from '@/offline/offlineOperations';
import { db } from '@/offline/db';
import { v4 as uuidv4 } from 'uuid';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, LayoutGrid, List, User, Printer, ShoppingBag } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/Dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";
import { toast } from 'sonner';
import { printer } from '@/services/printing';
import { useTranslation } from 'react-i18next';

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    category?: { id: string; name: string };
    media?: Media[];
}

interface CartItem {
    productId: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    discount: number;
}

export function PosPage() {
    const { currentStore } = useStore();
    const queryClient = useQueryClient();
    const { isOnline, isSyncing, pendingOperations } = useSync();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [globalDiscount, setGlobalDiscount] = useState<number>(0);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

    const { t } = useTranslation();

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);

    // Fetch Customers
    const { data: customers } = useQuery<any[]>({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await api.get('/customers');
            return response.data;
        },
    });

    // Fetch Products
    const { data: products } = useQuery<Product[]>({
        queryKey: ['products', currentStore?.id],
        queryFn: async () => {
            // Note: storeId is automatically added by the API interceptor
            const response = await api.get('/products');
            return response.data;
        },
        enabled: !!currentStore?.id || true, // Allow fetching if organization-wide (e.g. owner) but prefer store context
    });

    // Fetch Categories
    const { data: categories } = useQuery<any[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await api.get('/categories');
            return response.data;
        },
    });

    // Fetch Stock Levels (for display)
    const { data: stockLevels } = useQuery<any[]>({
        queryKey: ['stock-levels', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const response = await api.get(`/stock/store/${currentStore.id}`);
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    const createSaleMutation = useMutation({
        networkMode: 'always', // CRITICAL: Execute mutation even when offline
        mutationFn: async (data: any) => {
            console.log('🔍 ===== MUTATION FUNCTION STARTED =====');
            console.log('🔍 Mutation started, navigator.onLine:', navigator.onLine);
            console.log('📦 Mutation data:', data);

            try {
                // If offline, save locally
                if (!navigator.onLine) {
                    console.log('💾 Saving offline...');
                    const saleId = uuidv4();
                    const userId = localStorage.getItem('userId') || 'unknown';

                    const saleData = {
                        id: saleId,
                        storeId: data.storeId,
                        customerId: data.customerId,
                        totalAmount: cartTotal,
                        paidAmount: data.paidAmount,
                        discount: data.discount || 0,
                        status: (data.paidAmount >= cartTotal ? 'PAID' : 'PARTIAL') as 'PAID' | 'PARTIAL' | 'PENDING' | 'CANCELLED',
                        notes: data.notes,
                        createdBy: userId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        clientId: uuidv4(),
                        items: data.items.map((item: any) => ({
                            id: uuidv4(),
                            saleId: saleId,
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discount || 0,
                            total: (item.quantity * item.unitPrice) - (item.discount || 0)
                        }))
                    };

                    // Save to IndexedDB
                    console.log('💾 Saving to IndexedDB...');
                    await db.sales.add(saleData);
                    console.log('💾 Saved to IndexedDB');

                    // Add to sync queue
                    console.log('💾 Adding to sync queue...');
                    await saveOffline('sales', saleData, false);
                    console.log('💾 Added to sync queue');

                    console.log('✅ Offline save complete');
                    return { data: saleData };
                }

                // If online, normal API request
                console.log('🌐 Making online API request...');
                console.log('🌐 API URL:', '/sales');
                console.log('🌐 Request data:', data);

                const response = await api.post('/sales', data);

                console.log('✅ API response received:', response);
                return response;
            } catch (error) {
                console.error('❌ Error in mutationFn:', error);
                throw error;
            }
        },
        onSuccess: (response) => {
            console.log('🎉 onSuccess called, response:', response);
            // Store the sale data for printing
            setLastSale(response.data);
            setIsPaymentModalOpen(false);
            setShowSuccessModal(true);

            // Clear cart immediately
            setCart([]);
            setGlobalDiscount(0);

            // Refresh background data
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });

            // Different message based on mode
            if (!navigator.onLine) {
                toast.success(t('pos.success.saved_offline', 'Vente enregistrée localement. Elle sera synchronisée automatiquement.'));
            }
        },
        onError: (error: any) => {
            console.error('❌ onError called, error:', error);
            if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
                toast.error(t('pos.error.network', 'Erreur réseau. Vérifiez votre connexion.'));
            } else if (error.code === 'ECONNABORTED') {
                toast.error(t('pos.error.timeout', 'La requête a expiré. Réessayez.'));
            } else {
                toast.error(t('pos.error.process_sale', 'Erreur lors du traitement de la vente'));
            }
            console.error(error);
        }
    });

    // Filter Products
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category?.id === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                unitPrice: product.basePrice,
                quantity: 1,
                discount: 0
            }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updateDiscount = (productId: string, discount: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                return { ...item, discount: Math.max(0, discount) };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const itemsTotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice) - item.discount, 0);
    const cartTotal = Math.max(0, itemsTotal - globalDiscount);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = () => {
        console.log('🚀 handleCheckout called!');
        console.log('Current store:', currentStore);
        console.log('Cart:', cart);
        console.log('Payment details:', { paidAmount, paymentMethod, selectedCustomerId, globalDiscount });
        console.log('createSaleMutation object:', createSaleMutation);
        console.log('createSaleMutation.mutate type:', typeof createSaleMutation.mutate);

        if (!currentStore) {
            console.log('❌ No current store, returning early');
            return;
        }

        const mutationData = {
            storeId: currentStore.id,
            items: cart.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount
            })),
            customerId: selectedCustomerId || undefined,
            paymentMethod: paidAmount > 0 ? paymentMethod : undefined,
            paidAmount: paidAmount,
            discount: globalDiscount,
            notes: `POS Sale - ${paymentMethod}`
        };

        console.log('📤 About to call mutate with data:', mutationData);

        try {
            createSaleMutation.mutate(mutationData);
            console.log('✅ mutate() called successfully');
        } catch (error) {
            console.error('❌ Error calling mutate():', error);
        }
    };

    const [customerNameForPrint, setCustomerNameForPrint] = useState('');
    const [isProcessingPrint, setIsProcessingPrint] = useState(false);

    const handlePrintInvoice = async () => {
        if (!lastSale) return;

        // If no customer is attached but a name is provided, create/assign customer first
        if (!lastSale.customerId && customerNameForPrint.trim()) {
            setIsProcessingPrint(true);
            try {
                // 1. Create the customer
                const customerRes = await api.post('/customers', {
                    name: customerNameForPrint
                });
                const newCustomer = customerRes.data;

                // 2. Update the sale with the new customer
                const updatedSaleRes = await api.patch(`/sales/${lastSale.id}`, {
                    customerId: newCustomer.id
                });

                // 3. Print with the updated sale data
                printer.printInvoice(updatedSaleRes.data, currentStore?.name, t);

                // Update local state to reflect the change (prevents asking again if they print again)
                setLastSale(updatedSaleRes.data);
            } catch (error) {
                console.error("Error assigning customer:", error);
                toast.error("Failed to assign customer. Printing without name.");
                printer.printInvoice(lastSale, currentStore?.name, t);
            } finally {
                setIsProcessingPrint(false);
            }
        } else {
            // Standard print
            printer.printInvoice(lastSale, currentStore?.name, t);
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccessModal(false);
        setLastSale(null);
        setCustomerNameForPrint('');
    };

    const getStockLevel = (productId: string) => {
        const item = stockLevels?.find(s => s.id === productId);
        return item?.quantity || 0;
    };

    const CartContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {t('pos.current_sale')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{totalItems} {t('pos.items')}</span>
                        {/* Sync Status Indicator */}
                        {pendingOperations > 0 && (
                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1">
                                {isSyncing ? '🔄' : '⏳'} {pendingOperations}
                            </span>
                        )}
                    </div>
                </div>

                {/* Customer Selection */}
                <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-700"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">{t('pos.walk_in_customer')}</option>
                        {customers?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex-1 min-w-0 mr-3">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.unitPrice.toLocaleString()} F x {item.quantity}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{t('pos.discount', 'Discount')}:</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-16 h-6 text-xs border border-gray-200 dark:border-gray-600 rounded px-1 dark:bg-gray-800 dark:text-gray-200"
                                    value={item.discount}
                                    onChange={(e) => updateDiscount(item.productId, parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg h-8">
                                <button
                                    onClick={() => updateQuantity(item.productId, -1)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.productId, 1)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                            <button
                                onClick={() => removeFromCart(item.productId)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50 space-y-4">
                        <ShoppingCart className="w-16 h-16" />
                        <p>{t('pos.cart_empty')}</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('pos.subtotal')}</span>
                    <span className="text-gray-900 dark:text-gray-100">{itemsTotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-4">
                    <span className="text-gray-600 dark:text-gray-400">{t('pos.global_discount', 'Global Discount')}</span>
                    <input
                        type="number"
                        min="0"
                        className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-right dark:bg-gray-700 dark:text-white"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>{t('pos.total')}</span>
                    <span>{cartTotal.toLocaleString()} FCFA</span>
                </div>
                <button
                    onClick={() => {
                        setPaidAmount(cartTotal);
                        setIsPaymentModalOpen(true);
                        setIsCartSheetOpen(false); // Close mobile sheet if open
                    }}
                    disabled={cart.length === 0}
                    className="w-full py-3 btn-theme-primary rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                    {t('pos.proceed_payment')}
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Offline Indicator */}
            {!isOnline && (
                <div className="fixed top-16 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg">
                    ⚠️ {t('common.offline', 'Mode hors ligne - Les ventes seront synchronisées automatiquement')}
                </div>
            )}
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                {/* Search & Filter Header */}
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 space-y-3 sm:space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                        <input
                            type="text"
                            placeholder={t('pos.search_placeholder')}
                            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 px-3 sm:px-4">
                    {/* Categories - Scrollable */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 smooth-scroll">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedCategory === 'all'
                                ? 'btn-theme-primary'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {t('pos.all_categories')}
                        </button>
                        {categories?.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedCategory === cat.id
                                    ? 'btn-theme-primary'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* View Toggles - Always visible */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex-shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-theme-primary'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-theme-primary'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>


                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4"
                        : "flex flex-col gap-2"
                    }>
                        {filteredProducts.map(product => {
                            const stock = getStockLevel(product.id);
                            const isLowStock = stock <= 10;

                            if (viewMode === 'list') {
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold overflow-hidden">
                                                {product.media && product.media.length > 0 ? (
                                                    <img
                                                        src={product.media[0].url}
                                                        alt={product.media[0].alt || product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    product.name.charAt(0)
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">{product.name}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{product.sku}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className={`text-xs px-2 py-1 rounded-full w-fit ${stock === 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                                                isLowStock ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                                                    'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                                }`}>
                                                {t('pos.stock')}: {stock}
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-gray-100 min-w-[80px] text-right">
                                                {product.basePrice.toLocaleString()} F
                                            </span>
                                        </div>
                                    </button>
                                );
                            }

                            // Grid View Card
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all text-left flex flex-col justify-between h-full group"
                                >
                                    <div>
                                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center text-gray-300 dark:text-gray-500 overflow-hidden relative">
                                            {product.media && product.media.length > 0 ? (
                                                <img
                                                    src={product.media[0].url}
                                                    alt={product.media[0].alt || product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-4xl font-bold text-gray-200 dark:text-gray-600">
                                                    {product.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.sku}</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                                {product.basePrice.toLocaleString()} F
                                            </span>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full w-fit ${stock === 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                                            isLowStock ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                                                'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                            }`}>
                                            {t('pos.stock')}: {stock}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right: Cart - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:flex w-96 flex-col">
                <CartContent />
            </div>

            {/* Mobile Cart Button - Fixed at bottom on mobile */}
            <div className="lg:hidden fixed bottom-16 left-4 right-4 z-20">
                {cart.length > 0 && (
                    <button
                        onClick={() => setIsCartSheetOpen(true)}
                        className="w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-4 flex items-center justify-between touch-target active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl">
                                <ShoppingBag className="w-6 h-6 text-theme-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {totalItems} {t('pos.items')}
                                </p>
                                <p className="text-base font-bold text-theme-primary">
                                    {cartTotal.toLocaleString()} FCFA
                                </p>
                            </div>
                        </div>
                        <div className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm">
                            {t('pos.view_cart', 'Voir panier')}
                        </div>
                    </button>
                )}
            </div>

            {/* Mobile Cart Sheet */}
            <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
                <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-3xl">
                    <div className="h-full pt-6"> {/* Add top padding for handle area */}
                        <CartContent />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="w-[95vw] max-w-md sm:max-w-lg dark:bg-gray-800 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>{t('pos.payment.title')}</DialogTitle>
                        <DialogDescription className="dark:text-gray-400">
                            {t('pos.payment.description')} <strong>{cartTotal.toLocaleString()} FCFA</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-600 dark:text-gray-400">{t('pos.total_amount', 'Total Amount')}</span>
                                <span className="font-bold text-gray-900 dark:text-gray-100">{cartTotal.toLocaleString()} FCFA</span>
                            </div>

                            <div className="flex flex-col gap-1.5 mb-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('pos.global_discount', 'Remise Globale')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={globalDiscount}
                                    onChange={(e) => setGlobalDiscount(parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('pos.amount_paid', 'Amount Paid')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={cartTotal}
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            {/* Credit balance hidden as per user request */}
                        </div>

                        {paidAmount > 0 && (
                            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
                                <button
                                    onClick={() => setPaymentMethod('CASH')}
                                    className={`flex flex-col items-center justify-center p-3 sm:p-4 border-2 rounded-xl transition-all touch-target ${paymentMethod === 'CASH'
                                        ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Banknote className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                                    <span className="text-xs sm:text-sm font-medium">{t('pos.payment.cash')}</span>
                                </button>
                                {/* Card Payment Hidden as per request */}
                                <button
                                    onClick={() => setPaymentMethod('MOBILE')}
                                    className={`flex flex-col items-center justify-center p-3 sm:p-4 border-2 rounded-xl transition-all touch-target ${paymentMethod === 'MOBILE'
                                        ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                                    <span className="text-xs sm:text-sm font-medium">{t('pos.payment.mobile')}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <button
                            onClick={() => setIsPaymentModalOpen(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleCheckout}
                            disabled={createSaleMutation.isPending}
                            className="px-6 py-2 btn-theme-primary rounded-lg font-medium disabled:opacity-50"
                        >
                            {createSaleMutation.isPending
                                ? t('pos.payment.processing')
                                : !isOnline
                                    ? t('pos.payment.save_offline', 'Enregistrer (Hors ligne)')
                                    : t('pos.payment.confirm')
                            }
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success / Print Modal */}
            <Dialog open={showSuccessModal} onOpenChange={handleCloseSuccess}>
                <DialogContent className="w-[95vw] max-w-md sm:max-w-lg dark:bg-gray-800 dark:text-gray-100">
                    <DialogHeader>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <DialogTitle className="text-center">{t('pos.success.title')}</DialogTitle>
                        <DialogDescription className="text-center dark:text-gray-400">
                            {t('pos.success.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-3 py-4">
                        {!lastSale?.customer && (
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('pos.customer_name_invoice', 'Customer Name (for Invoice)')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={t('pos.enter_customer_name', 'Enter customer name (optional)')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    value={customerNameForPrint}
                                    onChange={(e) => setCustomerNameForPrint(e.target.value)}
                                />
                            </div>
                        )}

                        <button
                            onClick={handlePrintInvoice}
                            disabled={isProcessingPrint}
                            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            {isProcessingPrint ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Printer className="w-5 h-5 mr-2" />
                                    {t('pos.print_invoice')}
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleCloseSuccess}
                            className="w-full flex items-center justify-center px-4 py-3 btn-theme-primary rounded-lg text-sm font-medium"
                        >
                            {t('pos.new_sale')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
