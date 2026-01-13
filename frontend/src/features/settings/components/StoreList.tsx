import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, MapPin, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from 'sonner';

export function StoreList() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<any>(null);

    const queryClient = useQueryClient();

    const { data: stores, isLoading } = useQuery({
        queryKey: ['stores'],
        queryFn: async () => {
            const res = await api.get('/stores');
            return res.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/stores', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            setIsDialogOpen(false);
            setEditingStore(null);
            toast.success('Store created successfully');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.put(`/stores/${editingStore.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            setIsDialogOpen(false);
            setEditingStore(null);
            toast.success('Store updated successfully');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/stores/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store deleted');
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        if (editingStore) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Stores</h3>
                    <p className="text-sm text-gray-500">Manage your business locations</p>
                </div>
                <button
                    onClick={() => { setEditingStore(null); setIsDialogOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Add Store
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores?.map((store: any) => (
                    <div key={store.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-semibold text-lg text-gray-900">{store.name}</h4>
                                {store.address && (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {store.address}
                                    </div>
                                )}
                                {store.phone && (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                        <Phone className="w-3 h-3" />
                                        {store.phone}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setEditingStore(store); setIsDialogOpen(true); }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure? This cannot be undone.')) {
                                            deleteMutation.mutate(store.id);
                                        }
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStore ? 'Edit Store' : 'New Store'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Store Name</label>
                            <input
                                name="name"
                                defaultValue={editingStore?.name}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <input
                                name="address"
                                defaultValue={editingStore?.address}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input
                                name="phone"
                                defaultValue={editingStore?.phone}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                defaultValue={editingStore?.email}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Receipt Footer</label>
                            <textarea
                                name="receiptFooter"
                                defaultValue={editingStore?.receiptFooter}
                                rows={2}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Thank you for your visit!"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsDialogOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editingStore ? 'Save Changes' : 'Create Store'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
