import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Save, Store as StoreIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

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
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center">
                        <StoreIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Edit Store
                    </SheetTitle>
                    <SheetDescription>
                        Update details for your store location.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Store Name</label>
                        <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 rounded-lg shadow-sm px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Address</label>
                        <textarea
                            rows={3}
                            className="block w-full border border-gray-300 rounded-lg shadow-sm px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3 mt-8 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateStoreMutation.isPending}
                            className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm transition-all"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {updateStoreMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
