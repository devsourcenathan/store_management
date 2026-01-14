import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { X } from 'lucide-react';

interface Service {
    id?: string;
    name: string;
    provider: string;
    description?: string;
    isActive: boolean;
}

interface ServiceModalProps {
    service?: Service | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function ServiceModal({ service, onClose, onSuccess }: ServiceModalProps) {
    const [name, setName] = useState(service?.name || '');
    const [provider, setProvider] = useState(service?.provider || '');
    const [description, setDescription] = useState(service?.description || '');
    const [isActive, setIsActive] = useState(service?.isActive ?? true);

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (service?.id) {
                return api.put(`/services/${service.id}`, data);
            } else {
                return api.post('/services', data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['services'] });
            onSuccess();
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            name,
            provider,
            description,
            isActive,
            // organizationId is handled by backend based on user token usually, 
            // but if needed we can pass it. The backend service currently sets it from the controller request user.
            // organizationId: 'default-org-id' 
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{service ? 'Edit Service' : 'New Service'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Canal+ Access"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
                        <select
                            required
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                        >
                            <option value="">Select Provider</option>
                            <option value="CANAL_PLUS">Canal+</option>
                            <option value="NETFLIX">Netflix</option>
                            <option value="SPOTIFY">Spotify</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            id="isActive"
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                            Service Active
                        </label>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Saving...' : 'Save Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
