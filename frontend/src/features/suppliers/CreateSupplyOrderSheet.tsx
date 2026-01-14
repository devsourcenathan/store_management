import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Plus, Trash2 } from 'lucide-react';
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
    const { t } = useTranslation();
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
            <SheetContent className="w-[400px] sm:w-[640px] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-gray-900 dark:text-gray-100">{mode === 'view' ? t('common.order_details', 'Order Details') : t('suppliers.new_order')}</SheetTitle>
                    <SheetDescription className="text-gray-500 dark:text-gray-400">
                        {mode === 'view' ? t('suppliers.view_details_desc', 'View details of existing order') : t('suppliers.create_desc', 'Create a new order for a supplier')}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('suppliers.supplier')}</label>
                            <select
                                className="block w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 disabled:opacity-70"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                required
                                disabled={isReadOnly}
                            >
                                <option value="">{t('suppliers.select_supplier', 'Select Supplier')}</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('common.notes', 'Notes')}</label>
                            <textarea
                                className="block w-full rounded-lg border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 disabled:opacity-70"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                disabled={isReadOnly}
                                placeholder={t('suppliers.notes_placeholder', 'Optional notes...')}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">{t('common.items', 'Items')}</h3>
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    {t('suppliers.add_item', 'ADD ITEM')}
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 transition-all hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">{t('common.product', 'Product')}</label>
                                        <select
                                            className="block w-full rounded-md border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                            value={item.productId}
                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            required
                                            disabled={isReadOnly}
                                        >
                                            <option value="">{t('suppliers.select_product', 'Select Product')}</option>
                                            {products?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">{t('common.qty', 'Qty')}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="block w-full rounded-md border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                            required
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">{t('common.cost_unit', 'Cost / Unit')}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="block w-full rounded-md border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
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
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    {t('suppliers.no_items_added', 'No items added yet.')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="bg-gray-900 dark:bg-gray-700 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                            <span className="font-medium">{t('common.total_amount', 'Total Amount')}</span>
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
                                {createMutation.isPending ? t('common.processing', 'Processing...') : t('suppliers.create_order', 'Create Order')}
                            </button>
                        </div>
                    )}
                </form>
            </SheetContent>
        </Sheet>
    );
}
