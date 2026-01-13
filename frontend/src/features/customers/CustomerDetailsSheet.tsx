
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useStore } from "../stores/StoreProvider";
import { format } from "date-fns";
import { ShoppingBag, Calendar, CreditCard, Printer } from "lucide-react";
import { printer } from "@/services/printing";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/Sheet";

interface CustomerDetailsSheetProps {
    customerId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function CustomerDetailsSheet({ customerId, isOpen, onClose }: CustomerDetailsSheetProps) {
    const { currentStore } = useStore();

    const { data: customer } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
            if (!customerId) return null;
            // We can reuse the list to find the customer or fetch details if we had a proper endpoint.
            // For now, let's assume we can fetch all and find, or just optimize later.
            // BETTER: We will assume the parent passes the customer object OR we fetch specific logic.
            // Given the current API, let's just fetch all customers and find one (not optimal but works for MVP).
            const response = await api.get('/customers');
            return response.data.find((c: any) => c.id === customerId);
        },
        enabled: !!customerId,
    });

    const { data: sales, isLoading: isLoadingSales } = useQuery({
        queryKey: ['sales', { customerId }],
        queryFn: async () => {
            if (!customerId || !currentStore) return [];
            const response = await api.get(`/sales?storeId=${currentStore.id}&customerId=${customerId}`);
            return response.data;
        },
        enabled: !!customerId && !!currentStore,
    });

    if (!customer) return null;

    const totalSpent = sales?.reduce((acc: number, sale: any) => acc + Number(sale.totalAmount), 0) || 0;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl">{customer.name}</SheetTitle>
                    <SheetDescription>
                        {customer.email && <span>{customer.email} • </span>}
                        {customer.phone && <span>{customer.phone}</span>}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <ShoppingBag className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Spent</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">{totalSpent.toLocaleString()} F</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Orders</span>
                            </div>
                            <p className="text-2xl font-bold text-green-900">{sales?.length || 0}</p>
                        </div>
                    </div>

                    {/* Purchase History */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <CreditCard className="w-5 h-5 mr-2" />
                            Purchase History
                        </h3>

                        {isLoadingSales ? (
                            <div className="text-center py-8 text-gray-500">Loading history...</div>
                        ) : sales?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                No purchases found for this customer.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sales?.map((sale: any) => (
                                    <div key={sale.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">

                                        // ... inside map loop
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900">
                                                        {format(new Date(sale.createdAt), 'PPP')}
                                                    </p>
                                                    <button
                                                        onClick={() => printer.printInvoice(sale, currentStore?.name)}
                                                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {format(new Date(sale.createdAt), 'p')}
                                                </p>
                                            </div>
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                {sale.totalAmount.toLocaleString()} F
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {sale.items.length} items: {sale.items.map((i: any) => i.product.name).join(', ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
