import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, LayoutGrid, List, User, Printer } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/Dialog";
import { toast } from 'sonner';
import { printer } from '@/services/printing';
import { useTranslation } from 'react-i18next';

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    category?: { id: string; name: string };
}

interface CartItem {
    productId: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
}

export function PosPage() {
    const { currentStore } = useStore();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH');
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
            const params: any = {};
            if (currentStore?.id) {
                params.storeId = currentStore.id;
            }
            const response = await api.get('/products', { params });
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
        mutationFn: async (data: any) => {
            return api.post('/sales', data);
        },
        onSuccess: (response) => {
            // Store the sale data for printing
            setLastSale(response.data);
            setIsPaymentModalOpen(false);
            setShowSuccessModal(true);

            // Clear cart immediately
            setCart([]);

            // Refresh background data
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
        },
        onError: (error) => {
            toast.error(t('pos.error.process_sale'));
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
                quantity: 1
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

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = () => {
        if (!currentStore) return;
        createSaleMutation.mutate({
            storeId: currentStore.id,
            items: cart.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            })),
            customerId: selectedCustomerId || undefined,
            paymentMethod,
            notes: `POS Sale - ${paymentMethod}`
        });
    };

    const handlePrintInvoice = () => {
        if (lastSale) {
            printer.printInvoice(lastSale, currentStore?.name);
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccessModal(false);
        setLastSale(null);
    };

    const getStockLevel = (productId: string) => {
        const item = stockLevels?.find(s => s.id === productId);
        return item?.quantity || 0;
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex gap-6">
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder={t('pos.search_placeholder')}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 px-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 mr-4">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {t('pos.all_categories')}
                        </button>
                        {categories?.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>


                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
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
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold">
                                                {product.name.charAt(0)}
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
                                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center text-gray-300 dark:text-gray-500">
                                            {/* Placeholder for Image */}
                                            <div className="text-4xl font-bold text-gray-200 dark:text-gray-600">
                                                {product.name.charAt(0)}
                                            </div>
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

            {/* Right: Cart */}
            <div className="w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            {t('pos.current_sale')}
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{totalItems} {t('pos.items')}</span>
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

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.map(item => (
                        <div key={item.productId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex-1 min-w-0 mr-3">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.unitPrice.toLocaleString()} F x {item.quantity}
                                </p>
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
                    <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-gray-100">
                        <span>{t('pos.total')}</span>
                        <span>{cartTotal.toLocaleString()} FCFA</span>
                    </div>
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {t('pos.proceed_payment')}
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="dark:bg-gray-800 dark:text-gray-100">
                    <DialogHeader>
                        <DialogTitle>{t('pos.payment.title')}</DialogTitle>
                        <DialogDescription className="dark:text-gray-400">
                            {t('pos.payment.description')} <strong>{cartTotal.toLocaleString()} FCFA</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-3 gap-4 py-4">
                        <button
                            onClick={() => setPaymentMethod('CASH')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${paymentMethod === 'CASH'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Banknote className="w-8 h-8 mb-2" />
                            <span className="font-medium">{t('pos.payment.cash')}</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('CARD')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${paymentMethod === 'CARD'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <CreditCard className="w-8 h-8 mb-2" />
                            <span className="font-medium">{t('pos.payment.card')}</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('MOBILE')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${paymentMethod === 'MOBILE'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Smartphone className="w-8 h-8 mb-2" />
                            <span className="font-medium">{t('pos.payment.mobile')}</span>
                        </button>
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
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createSaleMutation.isPending ? t('pos.payment.processing') : t('pos.payment.confirm')}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success / Print Modal */}
            <Dialog open={showSuccessModal} onOpenChange={handleCloseSuccess}>
                <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:text-gray-100">
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
                        <button
                            onClick={handlePrintInvoice}
                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            <Printer className="w-5 h-5 mr-2" />
                            {t('pos.success.print')}
                        </button>
                        <button
                            onClick={handleCloseSuccess}
                            className="w-full px-4 py-3 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium"
                        >
                            {t('pos.success.new_sale')}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
