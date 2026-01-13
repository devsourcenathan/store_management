import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, LayoutGrid, List, User } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/Dialog";
import { toast } from 'sonner';

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
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/products');
            return response.data;
        },
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
        onSuccess: () => {
            toast.success('Sale completed successfully!');
            setCart([]);
            setIsPaymentModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['stock-alerts'] }); // Refresh alerts immediately
        },
        onError: (error) => {
            toast.error('Failed to process sale');
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
            paymentMethod,
            notes: `POS Sale - ${paymentMethod}`
        });
    };

    const getStockLevel = (productId: string) => {
        const item = stockLevels?.find(s => s.id === productId);
        return item?.quantity || 0;
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex gap-6">
            {/* Left: Product Grid */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-gray-100 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 mr-4">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            All Categories
                        </button>
                        {categories?.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid'
                                ? 'bg-white shadow-sm text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list'
                                ? 'bg-white shadow-sm text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>


                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
                                        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 font-bold">
                                                {product.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{product.name}</h3>
                                                <p className="text-xs text-gray-500">{product.sku}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className={`text-xs px-2 py-1 rounded-full w-fit ${stock === 0 ? 'bg-red-100 text-red-700' :
                                                isLowStock ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                Stock: {stock}
                                            </div>
                                            <span className="font-bold text-gray-900 min-w-[80px] text-right">
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
                                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left flex flex-col justify-between h-full group"
                                >
                                    <div>
                                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-300">
                                            {/* Placeholder for Image */}
                                            <div className="text-4xl font-bold text-gray-200">
                                                {product.name.charAt(0)}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-2">{product.sku}</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-lg text-gray-900">
                                                {product.basePrice.toLocaleString()} F
                                            </span>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full w-fit ${stock === 0 ? 'bg-red-100 text-red-700' :
                                            isLowStock ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                            Stock: {stock}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-96 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            Current Sale
                        </h2>
                        <span className="text-sm text-gray-500">{totalItems} items</span>
                    </div>

                    {/* Customer Selection */}
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none bg-white"
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="">Walk-in Customer</option>
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
                        <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex-1 min-w-0 mr-3">
                                <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                                <p className="text-sm text-gray-500">
                                    {item.unitPrice.toLocaleString()} F x {item.quantity}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg h-8">
                                    <button
                                        onClick={() => updateQuantity(item.productId, -1)}
                                        className="w-8 h-full flex items-center justify-center hover:bg-gray-50 text-gray-600"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, 1)}
                                        className="w-8 h-full flex items-center justify-center hover:bg-gray-50 text-gray-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.productId)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-4">
                            <ShoppingCart className="w-16 h-16" />
                            <p>Cart is empty</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                        <span>Total</span>
                        <span>{cartTotal.toLocaleString()} FCFA</span>
                    </div>
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        Proceed to Payment
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Payment</DialogTitle>
                        <DialogDescription>
                            Select payment method for total amount of <strong>{cartTotal.toLocaleString()} FCFA</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-3 gap-4 py-4">
                        <button
                            onClick={() => setPaymentMethod('CASH')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${paymentMethod === 'CASH'
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                        >
                            <Banknote className="w-8 h-8 mb-2" />
                            <span className="font-medium">Cash</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('CARD')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${paymentMethod === 'CARD'
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                        >
                            <CreditCard className="w-8 h-8 mb-2" />
                            <span className="font-medium">Card</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('MOBILE')}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${paymentMethod === 'MOBILE'
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                                }`}
                        >
                            <Smartphone className="w-8 h-8 mb-2" />
                            <span className="font-medium">Mobile</span>
                        </button>
                    </div>

                    <DialogFooter>
                        <button
                            onClick={() => setIsPaymentModalOpen(false)}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCheckout}
                            disabled={createSaleMutation.isPending}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {createSaleMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
