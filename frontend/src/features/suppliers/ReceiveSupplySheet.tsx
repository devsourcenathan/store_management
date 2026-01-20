import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet.tsx";
import { toast } from 'sonner';
import { useStore } from '../stores/StoreProvider';
import { AlertTriangle } from 'lucide-react';

interface ReceiveSupplySheetProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export function ReceiveSupplySheet({ isOpen, onClose, order }: ReceiveSupplySheetProps) {
    const { t } = useTranslation();
    const { currentStore } = useStore();
    const queryClient = useQueryClient();
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (order) {
            setItems(order.items.map((item: any) => ({
                productId: item.productId,
                productName: item.product.name,
                orderedQuantity: item.quantity,
                receivedQuantity: item.quantity, // Default to matching
                unitCost: item.unitCost
            })));
        }
    }, [order]);

    const receiveMutation = useMutation({
        mutationFn: async () => {
            if (!currentStore) throw new Error("No store selected");

            // Format payload
            const payload = items.map(i => ({
                productId: i.productId,
                quantity: i.receivedQuantity
            }));

            return api.post(`/supplies/${order.id}/receive`, {
                storeId: currentStore.id,
                items: payload
            });
        },
        onSuccess: () => {
            toast.success('Stock received and updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['supply-orders'] });
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            onClose();
        },
        onError: () => {
            toast.error('Failed to receive order');
        }
    });

    const handleQuantityChange = (index: number, val: string) => {
        const qty = parseInt(val) || 0;
        const newItems = [...items];
        newItems[index].receivedQuantity = qty;
        setItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.some(i => i.receivedQuantity < 0)) return;
        receiveMutation.mutate();
    };

    const totalBefore = items.reduce((acc, i) => acc + (i.orderedQuantity * i.unitCost), 0);
    const totalAfter = items.reduce((acc, i) => acc + (i.receivedQuantity * i.unitCost), 0);
    const hasDiscrepancy = totalBefore !== totalAfter;

    if (!order) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-gray-900 dark:text-gray-100">{t('suppliers.receive_shipment')} #{order.id.slice(0, 8)}</SheetTitle>
                    <SheetDescription className="text-gray-500 dark:text-gray-400">
                        {t('suppliers.receive_desc', 'Confirm quantities received. Adjust if necessary.')}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-theme-primary/10 p-4 rounded-lg flex items-start space-x-3 text-sm text-theme-primary">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        <p>{t('suppliers.verify_quantities', 'Verify quantities carefully. The stock will be updated based on the "Received" column, and the order total will be adjusted.')}</p>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={item.productId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.productName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.ordered', 'Ordered')}: {item.orderedQuantity}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('common.received_qty', 'Received Qty')}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-20 rounded-md border-gray-300 dark:border-gray-600 text-right focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={item.receivedQuantity}
                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span>{t('suppliers.original_total', 'Original Total')}:</span>
                            <span>{Number(totalBefore).toLocaleString()} F</span>
                        </div>
                        <div className={`flex justify-between font-bold text-lg ${hasDiscrepancy ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                            <span>{t('suppliers.final_total', 'Final Total')}:</span>
                            <span>{Number(totalAfter).toLocaleString()} F</span>
                        </div>
                        {hasDiscrepancy && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 text-right">
                                {t('suppliers.total_adjusted', 'Total adjusted due to quantity discrepancy')}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={receiveMutation.isPending}
                            className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {receiveMutation.isPending ? t('common.processing', 'Processing...') : t('suppliers.confirm_reception', 'Confirm Reception')}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
