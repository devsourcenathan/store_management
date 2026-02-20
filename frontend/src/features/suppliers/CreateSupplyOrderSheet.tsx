import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Plus, Trash2, PackageOpen, ShoppingCart, StickyNote } from 'lucide-react';
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
            <SheetContent className="w-[400px] sm:w-[500px] md:w-[700px] overflow-y-auto bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-6 py-5">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent flex items-center">
                            <ShoppingCart className="w-5 h-5 mr-2 text-theme-primary" />
                            {mode === 'view' ? t('common.order_details', 'Order Details') : t('suppliers.new_order')}
                        </SheetTitle>
                        <SheetDescription className="text-sm text-gray-500 dark:text-gray-400">
                            {mode === 'view' ? t('suppliers.view_details_desc', 'View details of existing order') : t('suppliers.create_desc', 'Create a new order for a supplier')}
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Primary Info Section */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700 shadow-sm space-y-5 transition-shadow hover:shadow-md">
                        <div>
                            <label className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                {t('suppliers.supplier')}
                            </label>
                            <select
                                className="block w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white px-4 py-2.5 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                required
                                disabled={isReadOnly}
                            >
                                <option value="" disabled>{t('suppliers.select_supplier', 'Select Supplier')}</option>
                                {suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                <StickyNote className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                {t('common.notes', 'Notes')}
                            </label>
                            <textarea
                                className="block w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white px-4 py-3 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                disabled={isReadOnly}
                                placeholder={t('suppliers.notes_placeholder', 'Optional notes...')}
                            />
                        </div>
                    </div>

                    {/* Order Items Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center">
                                <PackageOpen className="w-4 h-4 mr-2 text-theme-primary/80" />
                                {t('common.items', 'Items')}
                                <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-0.5 px-2 rounded-full hidden sm:inline-block">
                                    {items.length}
                                </span>
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="group relative grid grid-cols-[1fr_80px_100px_max-content] gap-3 items-end bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm transition-all hover:border-theme-primary/30 dark:hover:border-theme-primary/40 hover:shadow-md">
                                    <div className="min-w-0">
                                        <label className="block text-[11px] uppercase text-gray-400 font-bold mb-1.5">{t('common.product', 'Product')}</label>
                                        <select
                                            className="block w-full rounded-xl border-gray-200 dark:border-gray-600 text-sm bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white px-3 py-2 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 disabled:opacity-50"
                                            value={item.productId}
                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            required
                                            disabled={isReadOnly}
                                        >
                                            <option value="" disabled>{t('suppliers.select_product', 'Select Product')}</option>
                                            {products?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] uppercase text-gray-400 font-bold mb-1.5">{t('common.qty', 'Qty')}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="block w-full rounded-xl border-gray-200 dark:border-gray-600 text-sm bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white px-3 py-2 text-center focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 disabled:opacity-50 font-medium"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                            required
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] uppercase text-gray-400 font-bold mb-1.5">{t('common.cost_unit', 'Cost / Unit')}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="block w-full rounded-xl border-gray-200 dark:border-gray-600 text-sm bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white px-3 py-2 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 disabled:opacity-50 font-medium"
                                            value={item.unitCost === 0 ? '' : item.unitCost}
                                            onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                            required
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                            aria-label="Remove item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-3">
                                        <PackageOpen className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                        {t('suppliers.no_items_title', 'No Items Yet')}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
                                        {t('suppliers.no_items_desc', 'Start building this supply order by adding your first product from the catalog.')}
                                    </p>
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="text-xs font-semibold text-theme-primary hover:text-white bg-theme-primary/10 hover:bg-theme-primary px-4 py-2 rounded-lg transition-colors border border-theme-primary/20"
                                        >
                                            {t('suppliers.add_first_item', 'Add First Item')}
                                        </button>
                                    )}
                                </div>
                            )}

                            {items.length > 0 && !isReadOnly && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="w-full py-3.5 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:border-theme-primary/30 hover:text-theme-primary hover:bg-theme-primary/5 dark:hover:bg-theme-primary/10 transition-all group"
                                >
                                    <Plus className="w-4 h-4 mr-2 text-gray-400 group-hover:text-theme-primary transition-colors" />
                                    {t('suppliers.add_another_item', 'Add Another Item')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer / Summary Action */}
                    <div className="pt-2">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-4 sm:gap-2 justify-between items-center sm:items-end w-full relative overflow-hidden">
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>

                            <div className="flex flex-col items-center sm:items-start z-10 w-full sm:w-auto">
                                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">{t('common.total_amount', 'Total Amount')}</span>
                                <span className="font-extrabold text-3xl tabular-nums bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{totalAmount.toLocaleString()} <span className="text-xl text-gray-400 ml-1">FCFA</span></span>
                            </div>

                            {!isReadOnly && (
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-theme-primary hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-70 transition-all shadow-md shadow-theme-primary/20 hover:shadow-lg hover:shadow-theme-primary/40 transform hover:-translate-y-0.5 z-10"
                                >
                                    {createMutation.isPending ? t('common.processing', 'Processing...') : t('suppliers.create_order', 'Create Order')}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
