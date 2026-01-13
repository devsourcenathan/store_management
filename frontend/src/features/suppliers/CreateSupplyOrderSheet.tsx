import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Plus, Trash2, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateSupplyOrderSheetProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any; // For view/edit mode
    mode?: 'create' | 'view';
}

interface OrderItem {
    productId: string;
    quantity: number;
    unitCost: number;
}

export function CreateSupplyOrderSheet({ isOpen, onClose, initialData, mode = 'create' }: CreateSupplyOrderSheetProps) {
    const queryClient = useQueryClient();
    const [supplierId, setSupplierId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<OrderItem[]>([]);

    // Reset form when opening/closing or changing mode
    useEffect(() => {
        if (isOpen) {
            if (initialData && mode === 'view') {
                setSupplierId(initialData.supplierId);
                setNotes(initialData.notes || '');
                setItems(initialData.items.map((i: any) => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitCost: Number(i.unitCost) // Ensure number
                })));
            } else {
                setSupplierId('');
                setNotes('');
                setItems([]);
            }
        }
    }, [isOpen, initialData, mode]);

    // Fetch Suppliers
    const { data: suppliers } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await api.get('/suppliers');
            return res.data;
        }
    });

    // Fetch Products
    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get('/products');
            return res.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/supplies', data);
        },
        onSuccess: () => {
            toast.success('Supply order created successfully');
            queryClient.invalidateQueries({ queryKey: ['supply-orders'] });
            onClose();
            // Reset form
            setSupplierId('');
            setNotes('');
            setItems([]);
        },
        onError: () => {
            toast.error('Failed to create supply order');
        }
    });

    const addItem = () => {
        setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
    };

    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'view') return;

        if (!supplierId) {
            toast.error('Please select a supplier');
            return;
        }
        if (items.length === 0 || items.some(i => !i.productId || i.quantity <= 0)) {
            toast.error('Please add valid items');
            return;
        }

        createMutation.mutate({
            supplierId,
            notes,
            items
        });
    };

    const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const isReadOnly = mode === 'view';

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[640px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>{mode === 'view' ? 'Order Details' : 'New Supply Order'}</SheetTitle>
                    <SheetDescription>
                        {mode === 'view' ? 'View details of existing order' : 'Create a new order for a supplier'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Supplier</label>
                            <select
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-70"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                required
                                disabled={isReadOnly}
                            >
                                <option value="">Select Supplier</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                            <textarea
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-70"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                disabled={isReadOnly}
                                placeholder="Optional notes..."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Order Items</h3>
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    ADD ITEM
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-100 transition-all hover:border-blue-200 hover:shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Product</label>
                                        <select
                                            className="block w-full rounded-md border-gray-200 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                            value={item.productId}
                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            required
                                            disabled={isReadOnly}
                                        >
                                            <option value="">Select Product</option>
                                            {products?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="block w-full rounded-md border-gray-200 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                            required
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Cost / Unit</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="block w-full rounded-md border-gray-200 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                            value={item.unitCost}
                                            onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                            required
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="mt-6 text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {items.length === 0 && (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    No items added yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="bg-gray-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                            <span className="font-medium">Total Amount</span>
                            <span className="font-bold text-2xl">{totalAmount.toLocaleString()} FCFA</span>
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                {createMutation.isPending ? 'Processing...' : 'Create Order'}
                            </button>
                        </div>
                    )}
                </form>
            </SheetContent>
        </Sheet>
    );
}
