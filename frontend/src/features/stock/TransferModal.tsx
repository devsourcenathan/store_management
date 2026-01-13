import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { X, ArrowRight } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface Store {
    id: string;
    name: string;
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
        queryKey: ['products'],
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Transfer Stock</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Source Store (Read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">From Store</label>
                        <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 text-gray-700">
                            {currentStore?.name || 'No store selected'}
                        </div>
                    </div>

                    {/* Destination Store */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">To Store</label>
                        <select
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <select
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this transfer..."
                        />
                    </div>

                    {/* Transfer Summary */}
                    {productId && destinationStoreId && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-blue-900">{currentStore?.name}</span>
                                <ArrowRight className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-900">
                                    {stores.find(s => s.id === destinationStoreId)?.name}
                                </span>
                            </div>
                            <p className="text-xs text-blue-700 mt-1">
                                Transferring {quantity} unit(s) of {products?.find(p => p.id === productId)?.name}
                            </p>
                        </div>
                    )}

                    {showSuccess && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm text-center font-medium animate-pulse">
                            ✅ Transfer successful!
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={transferMutation.isPending || !currentStore || !destinationStoreId || !productId}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            {transferMutation.isPending ? 'Transferring...' : 'Transfer Stock'}
                        </button>
                    </div>

                    {transferMutation.isError && (
                        <div className="mt-2 text-sm text-red-600">
                            {(transferMutation.error as any)?.response?.data?.message || 'Transfer failed'}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
