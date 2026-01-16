import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { printer } from '@/services/printing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { CreateSupplyOrderSheet } from './CreateSupplyOrderSheet';
import { ReceiveSupplySheet } from './ReceiveSupplySheet';
import { Plus, Package, CheckCircle, Clock, Truck, MoreVertical, Calendar, Eye, Trash2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function SupplyOrdersPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'view'>('create');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [orderToReceive, setOrderToReceive] = useState<any>(null);

    // Actions Menu State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const { data: orders, isLoading } = useQuery({
        queryKey: ['supply-orders'],
        queryFn: async () => {
            const res = await api.get('/supplies');
            return res.data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/supplies/${id}`);
        },
        onSuccess: () => {
            toast.success('Order deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['supply-orders'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete order');
        }
    });

    const handleCreate = () => {
        setSheetMode('create');
        setSelectedOrder(null);
        setIsSheetOpen(true);
    };

    const handleView = (order: any) => {
        setSheetMode('view');
        setSelectedOrder(order);
        setIsSheetOpen(true);
        setActiveMenuId(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            deleteMutation.mutate(id);
        }
        setActiveMenuId(null);
    };

    const handleReceiveClick = (order: any) => {
        setOrderToReceive(order);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && !(event.target as Element).closest('.actions-menu')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8 p-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('suppliers.management_title')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('suppliers.management_subtitle')}</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">{t('suppliers.new_order')}</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
            ) : orders?.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
                >
                    <div className="bg-theme-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Truck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('suppliers.no_orders')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{t('suppliers.start_creating')}</p>
                </motion.div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {orders.map((order: any) => (
                        <motion.div
                            key={order.id}
                            variants={item}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group relative"
                        >
                            <div className="absolute top-4 right-4 z-10 actions-menu">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === order.id ? null : order.id);
                                    }}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                                >
                                    <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400 font-bold" />
                                </button>

                                <AnimatePresence>
                                    {activeMenuId === order.id && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="py-1">

                                                <button
                                                    onClick={() => {
                                                        printer.printSupplyOrder(order);
                                                        setActiveMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                                                >
                                                    <Printer className="w-4 h-4 mr-2" />
                                                    {t('suppliers.print_order')}
                                                </button>
                                                <button
                                                    onClick={() => handleView(order)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    {t('common.view_details', 'View Details')}
                                                </button>
                                                {order.status !== 'PAID' && (
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        {t('common.delete', 'Delete Order')}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center ${order.status === 'PAID'
                                    ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/20'
                                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-500/20'
                                    }`}>
                                    {order.status === 'PAID' ? (
                                        <>
                                            <CheckCircle className="w-3 h-3 mr-1" /> Received
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-3 h-3 mr-1" /> Pending
                                        </>
                                    )}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-1">{t('suppliers.supplier')}</p>
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{order.supplier.name}</h3>
                                </div>

                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {format(new Date(order.createdAt), 'PPP')}
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{order.items.length} items</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{Number(order.totalAmount).toLocaleString()} F</p>
                                    </div>

                                    {order.status !== 'PAID' && (
                                        <button
                                            onClick={() => handleReceiveClick(order)}
                                            className="px-4 py-2 btn-theme-primary text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow"
                                        >
                                            {t('suppliers.receive')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <CreateSupplyOrderSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                initialData={selectedOrder}
                mode={sheetMode}
            />

            <ReceiveSupplySheet
                isOpen={!!orderToReceive}
                onClose={() => setOrderToReceive(null)}
                order={orderToReceive}
            />
        </div>
    );
}
