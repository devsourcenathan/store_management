import React, { useState } from 'react';
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
import { RefreshCw } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { CreditStatusBadge } from './components/CreditStatusBadge';
import { CreditDetailsWidget } from './components/CreditDetailsWidget';
import { AddPaymentModal } from './components/AddPaymentModal';
import { CreditDetails, CreditStatus, CreditSaleType } from '@/types/credit';

interface Sale {
    id: string;
    createdAt: string;
    totalAmount: number;
    paidAmount: number;
    discount?: number;
    status: string;
    customer?: { name: string };
    creator?: { firstName: string; lastName: string };
    items: any[];
    payments?: any[];
    creditContract?: CreditDetails; // API returns creditContract, not creditDetails directly
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
    const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH, YEAR, CUSTOM
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const queryClient = useQueryClient();

    const { data: sales, isLoading, isError, error, refetch, isFetching } = useQuery<Sale[]>({
        queryKey: ['sales', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const response = await api.get('/sales');
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
        onSuccess: (response) => {
            const data = response.data;
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            setIsAddPaymentModalOpen(false);

            // Update local state to reflect payment immediately
            if (selectedSale && data.amount) {
                const newPaidAmount = selectedSale.paidAmount + data.amount;
                const newRemaining = (selectedSale.creditContract?.remainingAmount || 0) - data.amount;

                setSelectedSale({
                    ...selectedSale,
                    paidAmount: newPaidAmount,
                    creditContract: selectedSale.creditContract ? {
                        ...selectedSale.creditContract,
                        paidAmount: (selectedSale.creditContract.paidAmount || 0) + data.amount,
                        remainingAmount: newRemaining,
                        status: newRemaining <= 0 ? CreditStatus.COMPLETED : CreditStatus.ACTIVE
                    } : undefined
                });
            }
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
    };

    const handleConfirmPayment = (amount: number, method: string) => {
        if (!selectedSale) return;
        addPaymentMutation.mutate({
            amount,
            method,
            notes: 'Payment added via Sales History'
        });
    };

    const remainingBalance = selectedSale ? selectedSale.totalAmount - selectedSale.paidAmount : 0;

    // Filter Logic
    const filteredSales = sales?.filter(sale => {
        const matchesSearch = searchTerm === '' ||
            sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.items?.some((item: any) => item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            sale.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'COMPLETED' && sale.status === 'COMPLETED') ||
            (statusFilter === 'ACTIVE' && sale.status === 'PARTIAL') ||
            (statusFilter === 'OVERDUE' && sale.creditContract?.status === 'OVERDUE');

        let matchesDate = true;
        if (dateFilter !== 'ALL') {
            const saleDate = new Date(sale.createdAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dateFilter === 'TODAY') {
                matchesDate = saleDate >= today;
            } else if (dateFilter === 'WEEK') {
                const firstDayOfWeek = new Date(today);
                firstDayOfWeek.setDate(today.getDate() - today.getDay());
                matchesDate = saleDate >= firstDayOfWeek;
            } else if (dateFilter === 'MONTH') {
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                matchesDate = saleDate >= firstDayOfMonth;
            } else if (dateFilter === 'YEAR') {
                const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                matchesDate = saleDate >= firstDayOfYear;
            } else if (dateFilter === 'CUSTOM') {
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (saleDate < start) matchesDate = false;
                }
                if (endDate && matchesDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (saleDate > end) matchesDate = false;
                }
            }
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    const {
        currentItems,
        currentPage,
        totalPages,
        goToPage: setPage,
    } = usePagination({
        totalItems: filteredSales?.length || 0,
        itemsPerPage: 10,
    });

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, statusFilter, dateFilter, startDate, endDate]);

    const paginatedSales = filteredSales && filteredSales.length > 0 ? currentItems(filteredSales) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('sales.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('sales.subtitle')}</p>
                </div>
            </div>


            {/* Filters */}
            <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Row 1: search bar */}
                <input
                    type="text"
                    placeholder={t('common.search', 'Search...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white"
                />
                {/* Row 2: dropdowns */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="ALL">{t('common.all_statuses', 'All Statuses')}</option>
                        <option value="COMPLETED">{t('credit.status_completed', 'Completed')}</option>
                        <option value="ACTIVE">{t('credit.status_active', 'Active (Credit)')}</option>
                        <option value="OVERDUE">{t('credit.status_overdue', 'Overdue')}</option>
                    </select>

                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full sm:w-auto flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="ALL">{t('common.all_time', 'All Time')}</option>
                        <option value="TODAY">{t('common.today', 'Today')}</option>
                        <option value="WEEK">{t('common.this_week', 'This Week')}</option>
                        <option value="MONTH">{t('common.this_month', 'This Month')}</option>
                        <option value="YEAR">{t('common.this_year', 'This Year')}</option>
                        <option value="CUSTOM">{t('common.custom_date', 'Custom Date')}</option>
                    </select>
                </div>

                {/* Row 3: custom date pickers (only when CUSTOM is selected) */}
                {dateFilter === 'CUSTOM' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white"
                            title={t('common.start_date', 'Start Date')}
                        />
                        <span className="text-gray-500 text-center">—</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white"
                            title={t('common.end_date', 'End Date')}
                        />
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                    title={t('common.refresh', 'Refresh')}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <ExportButton
                    data={filteredSales || []}
                    columns={[
                        { header: t('common.date'), key: 'createdAt' },
                        { header: t('invoice.customer'), key: 'customer.name' },
                        { header: t('invoice.total'), key: 'totalAmount' },
                        { header: t('invoice.paid'), key: 'paidAmount' },
                        { header: t('common.seller'), key: 'creator.firstName' },
                        { header: t('common.status'), key: 'status' },
                    ]}
                    title={t('sales.title')}
                    format="pdf"
                    variant="outline"
                    size="sm"
                />

                <ExportButton
                    data={filteredSales || []}
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

            {/* Sales Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700" >
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4" >
                    {isLoading || (filteredSales && filteredSales.length > 0 && isFetching) ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <Skeleton className="h-5 w-32 mb-2" />
                                        <Skeleton className="h-4 w-48 mb-2" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <Skeleton className="h-3 w-20 mb-1" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Skeleton className="h-8 w-16 rounded-lg" />
                                        <Skeleton className="h-8 w-16 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : isError ? (
                        <div className="px-4 py-12 text-center text-red-500">
                            <p>Error loading sales.</p>
                            <p className="text-xs mt-1">{error?.message}</p>
                        </div>
                    ) : !filteredSales || filteredSales.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">{t('sales.no_sales', 'No sales found.')}</div>
                    ) : (
                        paginatedSales.map((sale) => (
                            <div key={sale.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                                {/* Sale Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {t('sales.products_sold', 'Products Sold')}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {sale.items?.map((item: any, idx: number) => (
                                                <span key={idx}>
                                                    {item.product?.name || item.name || 'Unknown'} ({item.quantity})
                                                    {idx < (sale.items?.length || 0) - 1 && ', '}
                                                </span>
                                            ))}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {sale.creator && (
                                                <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                    By: {sale.creator.firstName}
                                                </span>
                                            )}
                                        </p>
                                        {/* Customer Name Mobile */}
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                                            {sale.customer?.name || t('pos.walk_in_customer', 'Walk-in Customer')}
                                        </p>
                                    </div>
                                    <CreditStatusBadge status={sale.status} />
                                </div>

                                {/* Sale Details */}
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                                            Total / Paid
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {sale.totalAmount.toLocaleString()} / {sale.paidAmount.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-end justify-end space-x-2">
                                        <button
                                            onClick={() => printer.printInvoice(sale, currentStore || undefined, t)}
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
                    )
                    }
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block" >
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date', 'Date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('invoice.customer', 'Customer')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('sales.products', 'Products')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.total', 'Total')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.paid', 'Paid')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.seller', 'Seller')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status', 'Status')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading || (filteredSales && filteredSales.length > 0 && isFetching) ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <Skeleton className="h-8 w-16 rounded-lg" />
                                            <Skeleton className="h-8 w-16 rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : isError ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-red-500">Error: {error?.message}</td></tr>
                            ) : !filteredSales || filteredSales.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('sales.no_sales', 'No sales found.')}</td></tr>
                            ) : (
                                paginatedSales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {sale.customer?.name || <span className="text-gray-400 italic">{t('pos.walk_in_customer', 'Walk-in Customer')}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <div className="max-w-xs">
                                                {sale.items?.map((item: any, idx: number) => (
                                                    <div key={idx} className="text-xs">
                                                        {item.product?.name || item.name || 'Unknown'} <span className="text-gray-500">({item.quantity})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sale.totalAmount.toLocaleString()} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{sale.paidAmount.toLocaleString()} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {sale.creator ? `${sale.creator.firstName} ${sale.creator.lastName}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <CreditStatusBadge status={sale.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => printer.printInvoice(sale, currentStore || undefined, t)}
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

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}

            {/* Sale Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen} >
                <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto w-full">
                    {selectedSale && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="flex justify-between items-center">
                                    <span>{t('sales.details', 'Sale Details')}</span>
                                    <CreditStatusBadge status={selectedSale.status} />
                                </SheetTitle>
                                <SheetDescription>
                                    {t('sales.ref')}: {selectedSale.id.substring(0, 8)} • {new Date(selectedSale.createdAt).toLocaleString()}
                                    {selectedSale.creator && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('sales.by', 'By')}:</span>
                                            <span>{selectedSale.creator.firstName} {selectedSale.creator.lastName}</span>
                                        </div>
                                    )}
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('invoice.customer')}:</span>
                                        <span>{selectedSale.customer?.name || t('pos.walk_in_customer', 'Walk-in Customer')}</span>
                                    </div>
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* Credit Details Widget */}
                                {selectedSale.creditContract && (
                                    <CreditDetailsWidget
                                        creditDetails={selectedSale.creditContract}
                                        paidAmount={selectedSale.paidAmount}
                                    />
                                )}

                                {/* Items List */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                        {t('sales.items', 'Items')}
                                    </h4>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                                        {selectedSale.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.product?.name || item.name || t('sales.unknown_product', 'Unknown Product')}</p>
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
                                                <span>{t('sales.global_discount', 'Global Discount')}</span>
                                                <span>-{selectedSale.discount} F</span>
                                            </div>
                                        )}
                                        <div className={`flex justify-between items-center pt-3 ${!(selectedSale.discount || 0) ? 'border-t border-gray-200 dark:border-gray-700' : ''} font-bold`}>
                                            <span>{t('pos.total', 'Total')}</span>
                                            <span>{selectedSale.totalAmount} F</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span>{t('pos.paid', 'Paid Amount')}</span>
                                            <span>{selectedSale.paidAmount} F</span>
                                        </div>
                                        {remainingBalance > 0 && (
                                            <div className="flex justify-between items-center text-red-600 dark:text-red-400 font-bold">
                                                <span>{t('sales.balance_due', 'Balance Due')}</span>
                                                <span>{remainingBalance} F</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Payment History Universal */}
                                {(() => {
                                    // Combine and deduplicate payments
                                    const rawPayments = [
                                        ...(selectedSale.payments || []).map((p: any) => ({ id: p.id, amount: p.amount, method: p.method, date: p.createdAt || p.paidAt, source: 'sale' })),
                                        ...(selectedSale.creditContract?.payments || []).map((p: any) => ({ id: p.id, amount: p.amount, method: p.method, date: p.paidAt, source: 'credit' }))
                                    ];

                                    // Deduplicate based on amount and time (within 10 seconds)
                                    const uniquePayments: typeof rawPayments = [];
                                    rawPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(p => {
                                        const duplicate = uniquePayments.find(up =>
                                            up.amount === p.amount &&
                                            Math.abs(new Date(up.date).getTime() - new Date(p.date).getTime()) < 10000
                                        );
                                        if (!duplicate) {
                                            uniquePayments.push(p);
                                        }
                                    });

                                    if (uniquePayments.length === 0) return null;

                                    return (
                                        <div className="mt-6">
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                                                {t('credit.payment_history', 'Historique des paiements')}
                                            </h4>
                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                                                <table className="min-w-full text-xs">
                                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">{t('common.date', 'Date')}</th>
                                                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">{t('pos.amount', 'Montant')}</th>
                                                            <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">{t('pos.payment_method', 'Mode')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                        {uniquePayments.map((payment) => (
                                                            <tr key={payment.id}>
                                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                                                    {new Date(payment.date).toLocaleDateString()} {new Date(payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-medium">
                                                                    {payment.amount.toLocaleString()} FCFA
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                                                    {t(`payment_methods.${payment.method?.toLowerCase()}`, payment.method) as string}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Add Payment Button */}
                                {remainingBalance > 0 && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                        <button
                                            onClick={() => setIsAddPaymentModalOpen(true)}
                                            className="w-full btn-theme-primary py-3 rounded-lg font-medium"
                                        >
                                            {t('sales.add_payment', 'Add Payment')} ({remainingBalance} FCFA)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Add Payment Modal */}
            <AddPaymentModal
                isOpen={isAddPaymentModalOpen}
                onClose={() => setIsAddPaymentModalOpen(false)}
                onConfirm={handleConfirmPayment}
                remainingAmount={remainingBalance}
                isProcessing={addPaymentMutation.isPending}
            />

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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Customer
                            </label>
                            <select
                                value={newSale.customerId}
                                onChange={(e) => setNewSale({ ...newSale, customerId: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 dark:bg-gray-700 dark:text-white"
                                required
                            >
                                <option value="">Select a customer</option>
                                <option value="WALK_IN">Walk-in Customer</option>
                                {customers?.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Add Products
                            </label>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 p-2 dark:bg-gray-700 dark:text-white"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAddItem(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                >
                                    <option value="">Select product to add...</option>
                                    {products?.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} - {product.basePrice} FCFA
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {newSale.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                        <p className="text-sm text-gray-500">{item.unitPrice} FCFA x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...newSale.items];
                                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                                setNewSale({ ...newSale, items: newItems });
                                            }}
                                            className="w-16 rounded-md border border-gray-300 dark:border-gray-600 p-1 dark:bg-gray-700 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {newSale.items.length === 0 && (
                                <p className="text-center text-gray-500 text-sm py-4">No items added yet</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={newSale.notes}
                                onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 dark:bg-gray-700 dark:text-white h-24"
                                placeholder="Optional notes..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
