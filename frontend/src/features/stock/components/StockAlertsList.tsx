import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AlertTriangle, CheckCircle, RefreshCw, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StockAlert {
    id: string;
    productId: string;
    storeId: string;
    threshold: number;
    currentLevel: number;
    createdAt: string;
    product: {
        id: string;
        name: string;
        sku: string;
    };
}

interface StockAlertsListProps {
    storeId: string;
}

export function StockAlertsList({ storeId }: StockAlertsListProps) {
    const queryClient = useQueryClient();

    const { data: alerts, isLoading } = useQuery<StockAlert[]>({
        queryKey: ['stock-alerts', storeId],
        queryFn: async () => {
            const response = await api.get(`/stock/alerts/${storeId}`);
            return response.data;
        },
        enabled: !!storeId,
    });

    const acknowledgeAlertMutation = useMutation({
        mutationFn: async (alertId: string) => {
            return api.patch(`/stock/alerts/${alertId}/acknowledge`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
        },
    });

    const scanAlertsMutation = useMutation({
        mutationFn: async () => {
            return api.post('/stock/alerts/scan', { storeId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
        },
    });

    if (isLoading) return (
        <div className="animate-pulse flex space-x-4 mb-6 p-4 border rounded-xl bg-white dark:bg-gray-800 shadow-sm dark:border-gray-700">
            <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
            </div>
        </div>
    );

    const hasAlerts = alerts && alerts.length > 0;

    return (
        <div className={`mb-8 overflow-hidden rounded-xl border transition-all duration-300 ${hasAlerts
            ? 'bg-white dark:bg-gray-800 border-red-100 dark:border-red-900/30 shadow-md ring-1 ring-red-50 dark:ring-red-900/20'
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'
            }`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${hasAlerts ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                }`}>
                <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${hasAlerts ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {hasAlerts ? <AlertTriangle className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-semibold ${hasAlerts ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                            Stock Alerts
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {hasAlerts
                                ? `${alerts.length} product${alerts.length > 1 ? 's' : ''} below minimum threshold`
                                : 'Inventory levels are healthy'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => scanAlertsMutation.mutate()}
                    disabled={scanAlertsMutation.isPending}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${scanAlertsMutation.isPending
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500 shadow-sm hover:shadow'
                        }`}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${scanAlertsMutation.isPending ? 'animate-spin' : ''}`} />
                    {scanAlertsMutation.isPending ? 'Scanning...' : 'Check Levels'}
                </button>
            </div>

            {hasAlerts && (
                <div className="divide-y divide-red-50 dark:divide-red-900/10">
                    <AnimatePresence>
                        {alerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors group"
                            >
                                <div className="flex items-start mb-3 sm:mb-0">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {alert.product.name}
                                            </p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {alert.product.sku}
                                            </span>
                                        </div>
                                        <div className="flex items-center mt-1 text-sm text-red-600 dark:text-red-400 font-medium">
                                            <span className="flex items-center bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded text-red-700 dark:text-red-300">
                                                In Stock: {alert.currentLevel}
                                            </span>
                                            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                Required: {alert.threshold}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            Detected: {new Date(alert.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                    disabled={acknowledgeAlertMutation.isPending}
                                    className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 hover:shadow-sm
                                        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark Resolved
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
