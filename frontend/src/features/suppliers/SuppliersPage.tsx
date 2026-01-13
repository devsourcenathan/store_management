import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

export function SuppliersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
    const queryClient = useQueryClient();

    const { data: suppliers, isLoading } = useQuery<Supplier[]>({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const response = await api.get('/suppliers');
            return response.data;
        },
    });

    const createSupplierMutation = useMutation({
        mutationFn: async (newSupplier: any) => {
            return api.post('/suppliers', newSupplier);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createSupplierMutation.mutate(formData);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Suppliers</h2>
                    <p className="text-gray-600">Manage your product suppliers</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Supplier</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12">Loading...</div>
                ) : suppliers?.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg shadow">No suppliers found.</div>
                ) : (
                    suppliers?.map((supplier) => (
                        <div key={supplier.id} className="bg-white rounded-lg shadow p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
                                <div className="flex space-x-2">
                                    <button className="text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>                                    <button className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                {supplier.email && (
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center space-x-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center space-x-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{supplier.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add New Supplier</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                                <button type="submit" disabled={createSupplierMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    {createSupplierMutation.isPending ? 'Saving...' : 'Save Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
