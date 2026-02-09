import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Smartphone, Plus, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/Sheet";

interface Device {
    id: string;
    name: string;
    model?: string;
    serialNumber?: string;
    ownerType: 'INTERNAL' | 'CLIENT';
    customerId?: string;
    customer?: {
        id: string;
        name: string;
    };
    notes?: string;
    _count?: {
        maintenances: number;
    };
}

interface Customer {
    id: string;
    name: string;
}

export function DevicesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        model: '',
        serialNumber: '',
        ownerType: 'INTERNAL' as 'INTERNAL' | 'CLIENT',
        customerId: '',
        notes: ''
    });
    const [filterOwnerType, setFilterOwnerType] = useState<'ALL' | 'INTERNAL' | 'CLIENT'>('ALL');
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: devices, isLoading } = useQuery<Device[]>({
        queryKey: ['devices', filterOwnerType],
        queryFn: async () => {
            const params = filterOwnerType !== 'ALL' ? `?ownerType=${filterOwnerType}` : '';
            const response = await api.get(`/devices${params}`);
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

    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/devices', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => api.patch(`/devices/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!confirm(t('common.confirm_delete'))) throw new Error('Cancelled');
            return api.delete(`/devices/${id}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
    });

    const resetForm = () => {
        setFormData({ name: '', model: '', serialNumber: '', ownerType: 'INTERNAL', customerId: '', notes: '' });
        setEditingDevice(null);
    };

    const handleEdit = (device: Device) => {
        setEditingDevice(device);
        setFormData({
            name: device.name,
            model: device.model || '',
            serialNumber: device.serialNumber || '',
            ownerType: device.ownerType,
            customerId: device.customerId || '',
            notes: device.notes || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = { ...formData };
        if (formData.ownerType === 'INTERNAL') {
            submitData.customerId = '';
        }

        if (editingDevice) {
            updateMutation.mutate({ id: editingDevice.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('devices.title', 'Appareils')}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {t('devices.subtitle', 'Gérer les appareils internes et clients')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterOwnerType}
                        onChange={(e) => setFilterOwnerType(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                        <option value="ALL">{t('common.all', 'Tous')}</option>
                        <option value="INTERNAL">{t('devices.owner_type.internal', 'Interne')}</option>
                        <option value="CLIENT">{t('devices.owner_type.client', 'Client')}</option>
                    </select>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {t('devices.add_device', 'Ajouter')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                    ) : devices?.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 dark:text-gray-400">{t('devices.no_devices', 'Aucun appareil')}</div>
                    ) : (
                        devices?.map((device) => (
                            <div key={device.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{device.name}</h3>
                                        {device.model && <p className="text-sm text-gray-500 dark:text-gray-400">{device.model}</p>}
                                        {device.serialNumber && <p className="text-xs text-gray-400">SN: {device.serialNumber}</p>}
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded ${device.ownerType === 'INTERNAL' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                                        {device.ownerType === 'INTERNAL' ? t('devices.owner_type.internal') : t('devices.owner_type.client')}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {device.customer && <p>Client: {device.customer.name}</p>}
                                    {device._count && <p>{device._count.maintenances} maintenance(s)</p>}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => handleEdit(device)} className="text-blue-600 dark:text-blue-400 text-sm">
                                        {t('common.edit')}
                                    </button>
                                    <button onClick={() => deleteMutation.mutate(device.id)} className="text-red-600 dark:text-red-400 text-sm">
                                        {t('common.delete')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('devices.fields.name', 'Nom')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('devices.fields.model', 'Modèle')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('devices.fields.owner_type', 'Type')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('devices.fields.customer', 'Propriétaire')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center dark:text-gray-400">{t('common.loading')}</td></tr>
                            ) : devices?.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('devices.no_devices')}</td></tr>
                            ) : (
                                devices?.map((device) => (
                                    <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{device.name}</div>
                                            {device.serialNumber && <div className="text-xs text-gray-400">SN: {device.serialNumber}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{device.model || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded ${device.ownerType === 'INTERNAL' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                                                {device.ownerType === 'INTERNAL' ? t('devices.owner_type.internal') : t('devices.owner_type.client')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {device.customer?.name || t('devices.owner_type.internal')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(device)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 mr-3">
                                                {t('common.edit')}
                                            </button>
                                            <button onClick={() => deleteMutation.mutate(device.id)} className="text-red-600 dark:text-red-400 hover:text-red-900">
                                                {t('common.delete')}
                                            </button>
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
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{editingDevice ? t('devices.edit_device', 'Modifier') : t('devices.add_device')}</SheetTitle>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('devices.fields.name')} *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('devices.fields.model')}</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('devices.fields.serial_number', 'Numéro de série')}</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.serialNumber}
                                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('devices.fields.owner_type')} *</label>
                            <select
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.ownerType}
                                onChange={(e) => setFormData({ ...formData, ownerType: e.target.value as any })}
                            >
                                <option value="INTERNAL">{t('devices.owner_type.internal')}</option>
                                <option value="CLIENT">{t('devices.owner_type.client')}</option>
                            </select>
                        </div>
                        {formData.ownerType === 'CLIENT' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('devices.fields.customer')} *</label>
                                <select
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.customerId}
                                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                >
                                    <option value="">{t('common.select', 'Sélectionner')}</option>
                                    {customers?.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('devices.fields.notes', 'Notes')}</label>
                            <textarea
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
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
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {createMutation.isPending || updateMutation.isPending ? t('common.processing') : (editingDevice ? t('common.save') : t('devices.add_device'))}
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
