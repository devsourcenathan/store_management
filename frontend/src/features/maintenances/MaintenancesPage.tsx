import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Wrench, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/Sheet";
import { toast } from 'sonner';
import { useStore } from '@/features/stores/StoreProvider';

interface Maintenance {
    id: string;
    deviceId: string;
    device: {
        id: string;
        name: string;
        customer?: { name: string };
    };
    customerId?: string;
    customer?: { name: string };
    type: 'CLIENT' | 'INTERNAL';
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
    description: string;
    diagnosis?: string;
    laborCost: number;
    totalCost: number;
    parts: Array<{
        id: string;
        productId: string;
        product: { name: string };
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
}

interface Device {
    id: string;
    name: string;
    ownerType: 'INTERNAL' | 'CLIENT';
    customerId?: string;
    customer?: { id: string; name: string };
}

interface Product {
    id: string;
    name: string;
    basePrice: number;
}

export function MaintenancesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
    const [formData, setFormData] = useState({
        deviceId: '',
        description: '',
        diagnosis: '',
        laborCost: 0,
        parts: [] as Array<{ productId: string; quantity: number; unitPrice: number }>,
    });
    const [filterStatus, setFilterStatus] = useState<'ALL' | Maintenance['status']>('ALL');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    const { data: maintenances, isLoading } = useQuery<Maintenance[]>({
        queryKey: ['maintenances', filterStatus],
        queryFn: async () => {
            const params = filterStatus !== 'ALL' ? `?status=${filterStatus}` : '';
            const response = await api.get(`/maintenances${params}`);
            return response.data;
        },
    });

    const { data: devices } = useQuery<Device[]>({
        queryKey: ['devices'],
        queryFn: async () => {
            const response = await api.get('/devices');
            return response.data;
        },
    });

    const { data: products } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/products');
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/maintenances', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenances'] });
            setIsModalOpen(false);
            resetForm();
            toast.success(t('maintenances.created', 'Maintenance créée'));
        },
    });

    const completeMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!confirm(t('maintenances.alerts.complete_confirm', 'Confirmer la fin ? Le stock sera impacté.'))) {
                throw new Error('Cancelled');
            }
            return api.patch(`/maintenances/${id}/complete`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenances'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            toast.success(t('maintenances.completed', 'Maintenance terminée'));
        },
    });

    const cancelMutation = useMutation({
        mutationFn: async (id: string) => api.patch(`/maintenances/${id}/cancel`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenances'] });
            toast.success(t('maintenances.cancelled', 'Maintenance annulée'));
        },
    });

    useEffect(() => {
        if (formData.deviceId && devices) {
            const device = devices.find(d => d.id === formData.deviceId);
            setSelectedDevice(device || null);
        }
    }, [formData.deviceId, devices]);

    const resetForm = () => {
        setFormData({ deviceId: '', description: '', diagnosis: '', laborCost: 0, parts: [] });
        setEditingMaintenance(null);
        setSelectedDevice(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentStore) {
            toast.error(t('common.errors.no_store_selected', 'Aucune boutique sélectionnée'));
            return;
        }

        const submitData = {
            ...formData,
            type: selectedDevice?.ownerType === 'CLIENT' ? 'CLIENT' : 'INTERNAL',
            customerId: selectedDevice?.customerId || null,
            storeId: currentStore.id,
        };

        createMutation.mutate(submitData);
    };

    const addPart = () => {
        setFormData({
            ...formData,
            parts: [...formData.parts, { productId: '', quantity: 1, unitPrice: 0 }],
        });
    };

    const removePart = (index: number) => {
        setFormData({
            ...formData,
            parts: formData.parts.filter((_, i) => i !== index),
        });
    };

    const updatePart = (index: number, field: string, value: any) => {
        const newParts = [...formData.parts];
        newParts[index] = { ...newParts[index], [field]: value };

        if (field === 'productId' && products) {
            const product = products.find(p => p.id === value);
            if (product) {
                newParts[index].unitPrice = product.basePrice;
            }
        }

        setFormData({ ...formData, parts: newParts });
    };

    const calculateTotalCost = () => {
        const partsCost = formData.parts.reduce((sum, part) => sum + (part.quantity * part.unitPrice), 0);
        return formData.laborCost + partsCost;
    };

    const getStatusBadge = (status: Maintenance['status']) => {
        const colors = {
            PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
            IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
            DONE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        };
        return colors[status];
    };

    const getTypeBadge = (type: Maintenance['type']) => {
        return type === 'CLIENT'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('maintenances.title', 'Maintenances')}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {t('maintenances.subtitle', 'Gérer les maintenances et réparations')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                        <option value="ALL">{t('common.all', 'Tous')}</option>
                        <option value="PENDING">{t('maintenances.status.pending', 'En attente')}</option>
                        <option value="IN_PROGRESS">{t('maintenances.status.in_progress', 'En cours')}</option>
                        <option value="DONE">{t('maintenances.status.done', 'Terminée')}</option>
                        <option value="CANCELLED">{t('maintenances.status.cancelled', 'Annulée')}</option>
                    </select>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {t('maintenances.add_maintenance', 'Nouvelle')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                    ) : maintenances?.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">{t('maintenances.no_maintenances', 'Aucune maintenance')}</div>
                    ) : (
                        maintenances?.map((maintenance) => (
                            <div key={maintenance.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{maintenance.device.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{maintenance.description}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(maintenance.status)}`}>
                                            {t(`maintenances.status.${maintenance.status.toLowerCase()}`)}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded ${getTypeBadge(maintenance.type)}`}>
                                            {t(`maintenances.type.${maintenance.type.toLowerCase()}`)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {maintenance.customer && <p>Client: {maintenance.customer.name}</p>}
                                    <p>Coût: {maintenance.totalCost} FCFA</p>
                                    <p>{maintenance.parts.length} pièce(s)</p>
                                </div>
                                {maintenance.status !== 'DONE' && maintenance.status !== 'CANCELLED' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => completeMutation.mutate(maintenance.id)}
                                            className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            {t('maintenances.complete', 'Terminer')}
                                        </button>
                                        <button
                                            onClick={() => cancelMutation.mutate(maintenance.id)}
                                            className="text-red-600 dark:text-red-400 text-sm flex items-center gap-1"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            {t('maintenances.cancel', 'Annuler')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('maintenances.fields.device', 'Appareil')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('maintenances.fields.description')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('maintenances.fields.type', 'Type')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Coût</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center dark:text-gray-400">{t('common.loading')}</td></tr>
                            ) : maintenances?.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('maintenances.no_maintenances')}</td></tr>
                            ) : (
                                maintenances?.map((maintenance) => (
                                    <tr key={maintenance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{maintenance.device.name}</div>
                                            {maintenance.customer && <div className="text-xs text-gray-400">{maintenance.customer.name}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{maintenance.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded ${getTypeBadge(maintenance.type)}`}>
                                                {t(`maintenances.type.${maintenance.type.toLowerCase()}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(maintenance.status)}`}>
                                                {t(`maintenances.status.${maintenance.status.toLowerCase()}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{maintenance.totalCost} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {maintenance.status !== 'DONE' && maintenance.status !== 'CANCELLED' && (
                                                <>
                                                    <button
                                                        onClick={() => completeMutation.mutate(maintenance.id)}
                                                        className="text-green-600 dark:text-green-400 hover:text-green-900 mr-3"
                                                    >
                                                        {t('maintenances.complete')}
                                                    </button>
                                                    <button
                                                        onClick={() => cancelMutation.mutate(maintenance.id)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-900"
                                                    >
                                                        {t('maintenances.cancel')}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Sheet */}
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{t('maintenances.add_maintenance')}</SheetTitle>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenances.fields.device')} *</label>
                            <select
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.deviceId}
                                onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                            >
                                <option value="">{t('common.select', 'Sélectionner')}</option>
                                {devices?.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} {d.customer ? `(${d.customer.name})` : '(Interne)'}
                                    </option>
                                ))}
                            </select>
                            {selectedDevice && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Type: {selectedDevice.ownerType === 'CLIENT' ? 'Client - Facturable' : 'Interne - Non facturable'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenances.fields.description')} *</label>
                            <textarea
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenances.fields.diagnosis', 'Diagnostic')}</label>
                            <textarea
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                rows={2}
                                value={formData.diagnosis}
                                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenances.fields.labor_cost', 'Coût main d\'œuvre')} (FCFA)</label>
                            <input
                                type="number"
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.laborCost}
                                onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('maintenances.fields.parts', 'Pièces utilisées')}</label>
                                <button
                                    type="button"
                                    onClick={addPart}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    + Ajouter une pièce
                                </button>
                            </div>
                            {formData.parts.map((part, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <select
                                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white text-sm"
                                        value={part.productId}
                                        onChange={(e) => updatePart(index, 'productId', e.target.value)}
                                    >
                                        <option value="">Produit</option>
                                        {products?.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Qté"
                                        className="w-20 border border-gray-300 dark:border-gray-600 rounded-md p-2 dark:bg-gray-700 dark:text-white text-sm"
                                        value={part.quantity}
                                        onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePart(index)}
                                        className="text-red-600 dark:text-red-400 text-sm"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600 dark:text-gray-400">Coût main d'œuvre:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{formData.laborCost} FCFA</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">Coût pièces:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {formData.parts.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0)} FCFA
                                </span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
                                <span className="text-gray-900 dark:text-gray-100">Coût total:</span>
                                <span className="text-blue-600 dark:text-blue-400">{calculateTotalCost()} FCFA</span>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={() => { setIsModalOpen(false); resetForm(); }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {createMutation.isPending ? t('common.processing') : t('maintenances.add_maintenance')}
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
