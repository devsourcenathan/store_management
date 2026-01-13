import { useState } from 'react';
import { printer } from '@/services/printing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

interface Sale {
    id: string;
    createdAt: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    customer?: { name: string };
    items: any[];
}

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
}

interface Customer {
    id: string;
    name: string;
}

export function SalesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { currentStore } = useStore();
    const [newSale, setNewSale] = useState({
        customerId: '',
        items: [] as any[],
        notes: ''
    });

    const queryClient = useQueryClient();

    const { data: sales, isLoading } = useQuery<Sale[]>({
        queryKey: ['sales', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const response = await api.get(`/sales?storeId=${currentStore.id}`);
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    const { data: products } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/products');
            return response.data;
        },
    });

    const { data: customers } = useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await api.get('/customers');
            return response.data;
        },
    });

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
        mutationFn: async (saleData: any) => {
            if (!currentStore?.id) throw new Error('No store selected');
            return api.post('/sales', { ...saleData, storeId: currentStore.id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            setIsModalOpen(false);
            setNewSale({ customerId: '', items: [], notes: '' });
        },
    });

    const handleAddItem = (productId: string) => {
        const product = products?.find(p => p.id === productId);
        if (!product) return;

        setNewSale({
            ...newSale,
            items: [...newSale.items, {
                productId: product.id,
                quantity: 1,
                unitPrice: product.basePrice,
                name: product.name
            }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...newSale.items];
        newItems.splice(index, 1);
        setNewSale({ ...newSale, items: newItems });
    };

    // Calculate available stock for a product (for display purposes)
    const getAvailableStock = (productId: string): number => {
        const stockItem = stockLevels?.find(s => s.id === productId);
        return stockItem?.quantity || 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSale.items.length === 0) return alert('Add at least one item');
        createSaleMutation.mutate(newSale);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
                    <p className="text-gray-600">Manage sales and transactions</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    New Sale
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : sales?.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No sales found.</td></tr>
                        ) : (
                            sales?.map((sale) => (
                                <tr key={sale.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.customer?.name || 'Walk-in'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.totalAmount} FCFA</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{sale.status}</span>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => printer.printInvoice(sale, currentStore?.name)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            Print
                                        </button>
                                        <button className="text-gray-600 hover:text-gray-900">View</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Sale Sheet */}
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
                <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Create New Sale</SheetTitle>
                        <SheetDescription>
                            Add items and customer information to record a sale.
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Customer (Optional)</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={newSale.customerId}
                                    onChange={(e) => setNewSale({ ...newSale, customerId: e.target.value })}
                                >
                                    <option value="">Walk-in Customer</option>
                                    {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Add Product</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    onChange={(e) => {
                                        if (e.target.value) handleAddItem(e.target.value);
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">Search/Select product...</option>
                                    {products?.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} - {p.basePrice} FCFA (Stock: {getAvailableStock(p.id)})
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    💡 Tip: Current stock level is shown in parentheses.
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Items</h4>
                            <div className="border rounded-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {newSale.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.unitPrice} FCFA/unit</div>
                                                </td>
                                                <td className="px-4 py-2 text-sm">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-16 border rounded p-1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newItems = [...newSale.items];
                                                            newItems[index].quantity = parseInt(e.target.value);
                                                            setNewSale({ ...newSale, items: newItems });
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-sm text-right font-medium">
                                                    {item.quantity * item.unitPrice}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-red-600 hover:text-red-900 font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {newSale.items.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                                                    No items added yet. Search for a product above to add it to the sale.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {newSale.items.length > 0 && (
                                        <tfoot className="bg-gray-50 font-bold">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-right">Total Amount:</td>
                                                <td className="px-4 py-3 text-right text-blue-600 text-lg">
                                                    {newSale.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)} FCFA
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                rows={3}
                                value={newSale.notes}
                                onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                                placeholder="Add any notes about this sale..."
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-6">
                            <button
                                type="submit"
                                disabled={createSaleMutation.isPending || newSale.items.length === 0}
                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {createSaleMutation.isPending ? 'Processing...' : 'Complete & Print Invoice'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
