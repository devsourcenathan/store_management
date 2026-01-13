import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { toast } from 'sonner';
import { useStore } from '../stores/StoreProvider';
import { AlertTriangle } from 'lucide-react';

interface ReceiveSupplySheetProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

export function ReceiveSupplySheet({ isOpen, onClose, order }: ReceiveSupplySheetProps) {
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
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Receive Shipment #{order.id.slice(0, 8)}</SheetTitle>
                    <SheetDescription>
                        Confirm quantities received. Adjust if necessary.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3 text-sm text-blue-800">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p>Verify quantities carefully. The stock will be updated based on the "Received" column, and the order total will be adjusted.</p>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={item.productId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{item.productName}</p>
                                    <p className="text-xs text-gray-500">Ordered: {item.orderedQuantity}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <label className="block text-xs text-gray-500 mb-1">Received Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-20 rounded-md border-gray-300 text-right focus:border-blue-500 focus:ring-blue-500"
                                            value={item.receivedQuantity}
                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Original Total:</span>
                            <span>{Number(totalBefore).toLocaleString()} F</span>
                        </div>
                        <div className={`flex justify-between font-bold text-lg ${hasDiscrepancy ? 'text-orange-600' : 'text-green-600'}`}>
                            <span>Final Total:</span>
                            <span>{Number(totalAfter).toLocaleString()} F</span>
                        </div>
                        {hasDiscrepancy && (
                            <p className="text-xs text-orange-600 mt-1 text-right">
                                Total adjusted due to quantity discrepancy
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={receiveMutation.isPending}
                            className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {receiveMutation.isPending ? 'Processing...' : 'Confirm Reception'}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
