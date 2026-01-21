import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { printer } from '@/services/printing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { useThemedButtonStyle, getThemedButtonClasses } from '@/hooks/useThemedButton';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";
import { ExportButton } from '@/components/ExportButton';

interface Sale {
    id: string;
    createdAt: string;
    totalAmount: number;
    paidAmount: number;
    discount?: number;
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
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { currentStore } = useStore();
    const themedButtonStyle = useThemedButtonStyle('primary');
    const [newSale, setNewSale] = useState({
        customerId: '',
        items: [] as any[],
        notes: ''
    });

    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH');
    const [isAddingPayment, setIsAddingPayment] = useState(false);

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

    const addPaymentMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/sales/${selectedSale?.id}/payments`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            setIsAddingPayment(false);
            setPaymentAmount(0);
            setIsDetailsOpen(false);
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

    const handleViewDetails = (sale: Sale) => {
        setSelectedSale(sale);
        setIsDetailsOpen(true);
        setIsAddingPayment(false);
    };

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSale) return;
        addPaymentMutation.mutate({
            amount: paymentAmount,
            method: paymentMethod,
            notes: 'Payment added via Sales History'
        });
    };

    const remainingBalance = selectedSale ? selectedSale.totalAmount - selectedSale.paidAmount : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('sales.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('sales.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        data={sales || []}
                        columns={[
                            { header: t('common.date'), key: 'createdAt' },
                            { header: t('invoice.customer'), key: 'customer.name' },
                            { header: t('invoice.total'), key: 'totalAmount' },
                            { header: t('invoice.paid'), key: 'paidAmount' },
                            { header: t('common.status'), key: 'status' },
                        ]}
                        title={t('sales.title')}
                        format="pdf"
                        variant="outline"
                        size="sm"
                    />
                    <ExportButton
                        data={sales || []}
                        columns={[
                            { header: t('common.date'), key: 'createdAt' },
                            { header: t('invoice.customer'), key: 'customer.name' },
                            { header: t('invoice.total'), key: 'totalAmount' },
                            { header: t('invoice.paid'), key: 'paidAmount' },
                            { header: t('common.status'), key: 'status' },
                        ]}
                        title={t('sales.title')}
                        format="excel"
                        variant="outline"
                        size="sm"
                    />
                </div>
                {/* <button
                    onClick={() => setIsModalOpen(true)}
                    className={getThemedButtonClasses("w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap", !!themedButtonStyle.backgroundColor)}
                    style={themedButtonStyle}
                >
                    {t('sales.new_sale')}
                </button> */}
            </div>

            {/* Sales Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
                    ) : sales?.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No sales found.</div>
                    ) : (
                        sales?.map((sale) => (
                            <div key={sale.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                                {/* Sale Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {sale.customer?.name || 'Walk-in'}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(sale.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${sale.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                        sale.status === 'PARTIAL' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        }`}>
                                        {sale.status}
                                    </span>
                                </div>

                                {/* Sale Details */}
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                                            Total / Paid
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {sale.totalAmount} / {sale.paidAmount}
                                        </p>
                                    </div>
                                    <div className="flex items-end justify-end space-x-2">
                                        <button
                                            onClick={() => printer.printInvoice(sale, currentStore?.name, t)}
                                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                        >
                                            Print
                                        </button>
                                        <button
                                            onClick={() => handleViewDetails(sale)}
                                            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date', 'Date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.customer', 'Customer')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.total', 'Total')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.paid', 'Paid')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status', 'Status')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center dark:text-gray-400">Loading...</td></tr>
                            ) : sales?.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No sales found.</td></tr>
                            ) : (
                                sales?.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(sale.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{sale.customer?.name || 'Walk-in'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sale.totalAmount} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sale.paidAmount} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${sale.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                sale.status === 'PARTIAL' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                }`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => printer.printInvoice(sale, currentStore?.name, t)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                                            >
                                                {t('suppliers.print_order', 'Print')}
                                            </button>
                                            <button
                                                onClick={() => handleViewDetails(sale)}
                                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                                            >
                                                {t('common.view_details', 'View')}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sale Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto w-full">
                    {selectedSale && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="flex justify-between items-center">
                                    <span>Sale Details</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedSale.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                        selectedSale.status === 'PARTIAL' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        }`}>
                                        {selectedSale.status}
                                    </span>
                                </SheetTitle>
                                <SheetDescription>
                                    Ref: {selectedSale.id.substring(0, 8)} • {new Date(selectedSale.createdAt).toLocaleString()}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* Items List */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Items</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                                        {selectedSale.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.product?.name || item.name || 'Unknown Product'}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {item.quantity} x {item.unitPrice} F
                                                        {item.discount > 0 && <span className="text-red-500 ml-2">(-{item.discount} F)</span>}
                                                    </p>
                                                </div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {(item.quantity * item.unitPrice) - (item.discount || 0)} F
                                                </p>
                                            </div>
                                        ))}
                                        {(selectedSale.discount || 0) > 0 && (
                                            <div className="flex justify-between items-center pt-3 text-sm text-red-600 dark:text-red-400">
                                                <span>Global Discount</span>
                                                <span>-{selectedSale.discount} F</span>
                                            </div>
                                        )}
                                        <div className={`flex justify-between items-center pt-3 ${!(selectedSale.discount || 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''} font-bold`}>
                                            <span>Total</span>
                                            <span>{selectedSale.totalAmount} F</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span>Paid Amount</span>
                                            <span>{selectedSale.paidAmount} F</span>
                                        </div>
                                        {remainingBalance > 0 && (
                                            <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-bold">
                                                <span>Balance Due</span>
                                                <span>{remainingBalance} F</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Add Payment Section */}
                                {remainingBalance > 0 && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                        {!isAddingPayment ? (
                                            <button
                                                onClick={() => {
                                                    setPaymentAmount(remainingBalance);
                                                    setIsAddingPayment(true);
                                                }}
                                                className="w-full btn-theme-primary py-3 rounded-lg font-medium"
                                            >
                                                Add Payment ({remainingBalance} F)
                                            </button>
                                        ) : (
                                            <form onSubmit={handleAddPayment} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Record New Payment</h4>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                                                    <input
                                                        type="number"
                                                        max={remainingBalance}
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-800 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Method</label>
                                                    <select
                                                        value={paymentMethod}
                                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-800 dark:text-white"
                                                    >
                                                        <option value="CASH">Cash</option>
                                                        <option value="CARD">Card</option>
                                                        <option value="MOBILE">Mobile Money</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingPayment(false)}
                                                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={addPaymentMutation.isPending}
                                                        className="flex-1 btn-theme-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                                                    >
                                                        {addPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* New Sale Sheet (Existing) */}
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer (Optional)</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={newSale.customerId}
                                    onChange={(e) => setNewSale({ ...newSale, customerId: e.target.value })}
                                >
                                    <option value="">Walk-in Customer</option>
                                    {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add Product</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
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
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Items</h4>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {newSale.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.unitPrice} FCFA/unit</div>
                                                </td>
                                                <td className="px-4 py-2 text-sm">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-16 border border-gray-300 dark:border-gray-600 rounded p-1 dark:bg-gray-700 dark:text-white"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newItems = [...newSale.items];
                                                            newItems[index].quantity = parseInt(e.target.value);
                                                            setNewSale({ ...newSale, items: newItems });
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
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
                                        <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold text-gray-900 dark:text-gray-100">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-right">Total Amount:</td>
                                                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 text-lg">
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                            <textarea
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
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
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
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
