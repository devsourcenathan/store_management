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
        <div className="animate-pulse flex space-x-4 mb-6 p-4 border rounded-xl bg-white shadow-sm">
            <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
            </div>
        </div>
    );

    const hasAlerts = alerts && alerts.length > 0;

    return (
        <div className={`mb-8 overflow-hidden rounded-xl border transition-all duration-300 ${hasAlerts
                ? 'bg-white border-red-100 shadow-md ring-1 ring-red-50'
                : 'bg-white border-gray-100 shadow-sm'
            }`}>
            <div className={`px-6 py-4 flex justify-between items-center border-b ${hasAlerts ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'
                }`}>
                <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${hasAlerts ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {hasAlerts ? <AlertTriangle className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-semibold ${hasAlerts ? 'text-gray-900' : 'text-gray-700'}`}>
                            Stock Alerts
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
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
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 shadow-sm hover:shadow'
                        }`}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${scanAlertsMutation.isPending ? 'animate-spin' : ''}`} />
                    {scanAlertsMutation.isPending ? 'Scanning...' : 'Check Levels'}
                </button>
            </div>

            {hasAlerts && (
                <div className="divide-y divide-red-50">
                    <AnimatePresence>
                        {alerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-red-50/30 transition-colors group"
                            >
                                <div className="flex items-start mb-3 sm:mb-0">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-semibold text-gray-900 truncate">
                                                {alert.product.name}
                                            </p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                {alert.product.sku}
                                            </span>
                                        </div>
                                        <div className="flex items-center mt-1 text-sm text-red-600 font-medium">
                                            <span className="flex items-center bg-red-100 px-2 py-0.5 rounded text-red-700">
                                                In Stock: {alert.currentLevel}
                                            </span>
                                            <span className="mx-2 text-gray-300">|</span>
                                            <span className="text-gray-500">
                                                Reluired: {alert.threshold}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Detected: {new Date(alert.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                                    disabled={acknowledgeAlertMutation.isPending}
                                    className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        text-green-700 bg-green-50 hover:bg-green-100 hover:shadow-sm
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
