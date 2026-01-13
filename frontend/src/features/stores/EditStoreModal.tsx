import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { X, Save } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';

interface Store {
    id: string;
    name: string;
    address?: string;
    organizationId: string;
}

interface EditStoreModalProps {
    store: Store;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditStoreModal({ store, onClose, onSuccess }: EditStoreModalProps) {
    const { refreshUser } = useAuth();
    const [name, setName] = useState(store.name);
    const [address, setAddress] = useState(store.address || '');
    const queryClient = useQueryClient();

    useEffect(() => {
        setName(store.name);
        setAddress(store.address || '');
    }, [store]);

    const updateStoreMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.put(`/stores/${store.id}`, data);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            // Refresh user data to get updated stores list
            await refreshUser();
            onSuccess();
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateStoreMutation.mutate({
            name,
            address,
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Edit Store</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Store Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Boutique Douala"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="e.g., Akwa, Douala"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateStoreMutation.isPending}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {updateStoreMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
