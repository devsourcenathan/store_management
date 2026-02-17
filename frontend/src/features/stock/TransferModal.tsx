import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { ArrowRight } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface TransferModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function TransferModal({ onClose, onSuccess }: TransferModalProps) {
    const { currentStore, stores } = useStore();
    const [productId, setProductId] = useState('');
    const [destinationStoreId, setDestinationStoreId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const queryClient = useQueryClient();

    const { data: products } = useQuery<Product[]>({
        queryKey: ['products', currentStore?.id],
        queryFn: async () => {
            const response = await api.get('/products');
            return response.data;
        },
    });

    // Fetch current stock for selected product in current store
    const { data: currentStock } = useQuery({
        queryKey: ['stock-current', productId, currentStore?.id],
        queryFn: async () => {
            if (!productId || !currentStore?.id) return null;
            const response = await api.get(`/stock/current?productId=${productId}&storeId=${currentStore.id}`);
            return response.data;
        },
        enabled: !!productId && !!currentStore?.id,
    });

    const transferMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/stock/transfer', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['stock-current'] });
            onSuccess();
            // Reset fields
            setQuantity(1);
            setNotes('');
            setShowSuccess(true);
            // Hide success message after 3 seconds
            setTimeout(() => setShowSuccess(false), 3000);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStore?.id) return;

        transferMutation.mutate({
            productId,
            sourceStoreId: currentStore.id,
            destinationStoreId,
            quantity,
            notes
        });
    };

    // Filter out current store from destination options
    const availableDestinations = stores.filter(s => s.id !== currentStore?.id);

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Transfer Stock</SheetTitle>
                    <SheetDescription>
                        Move inventory between your stores.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Source Store (Read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From Store</label>
                        <div className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                            {currentStore?.name || 'No store selected'}
                        </div>
                    </div>

                    {/* Destination Store */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To Store</label>
                        <select
                            required
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            value={destinationStoreId}
                            onChange={(e) => setDestinationStoreId(e.target.value)}
                        >
                            <option value="">Select destination store...</option>
                            {availableDestinations.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Product */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product</label>
                        <select
                            required
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                        >
                            <option value="">Select product...</option>
                            {products?.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                </option>
                            ))}
                        </select>
                        {productId && currentStock && (
                            <p className="mt-1 text-sm text-gray-600">
                                Available stock: <span className="font-semibold">{currentStock.quantity || 0} units</span>
                            </p>
                        )}
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                        <textarea
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this transfer..."
                        />
                    </div>

                    {/* Transfer Summary */}
                    {productId && destinationStoreId && (
                        <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-md p-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-blue-900 dark:text-blue-200">{currentStore?.name}</span>
                                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium text-blue-900 dark:text-blue-200">
                                    {stores.find(s => s.id === destinationStoreId)?.name}
                                </span>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                Moving {quantity} unit(s) of {products?.find(p => p.id === productId)?.name}
                            </p>
                        </div>
                    )}

                    {showSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
                            ✅ Transfer successful!
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={transferMutation.isPending || !currentStore || !destinationStoreId || !productId}
                            className="flex items-center justify-center w-full px-4 py-3 btn-theme-primary rounded-md font-medium disabled:opacity-50 transition-colors"
                        >
                            {transferMutation.isPending ? 'Processing...' : 'Complete Transfer'}
                            {!transferMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>

                    {transferMutation.isError && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-md">
                            {(transferMutation.error as any)?.response?.data?.message || 'Transfer failed. Please check stock levels.'}
                        </div>
                    )}
                </form>
            </SheetContent>
        </Sheet>
    );
}
