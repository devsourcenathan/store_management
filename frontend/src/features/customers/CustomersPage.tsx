import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { CustomerDetailsSheet } from './CustomerDetailsSheet';

interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    creditLimit: number;
    currentCredit: number;
}

export function CustomersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', creditLimit: 0 });
    const queryClient = useQueryClient();

    const { data: customers, isLoading } = useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await api.get('/customers');
            return response.data;
        },
    });

    const createCustomerMutation = useMutation({
        mutationFn: async (newCustomer: any) => {
            return api.post('/customers', newCustomer);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', creditLimit: 0 });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createCustomerMutation.mutate(formData);
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // Filter customers
    const filteredCustomers = customers?.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
                    <p className="text-gray-600">Manage customer information</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Add Customer
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search customers by name, email or phone..."
                    className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Credit</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : filteredCustomers?.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No customers found matching your search.</td></tr>
                        ) : (
                            filteredCustomers?.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedCustomerId(customer.id)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {customer.email && <div>{customer.email}</div>}
                                        {customer.phone && <div>{customer.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.creditLimit} FCFA</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.currentCredit} FCFA</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            className="text-blue-600 hover:text-blue-900 mr-3 z-10 relative"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle Edit
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="text-red-600 hover:text-red-900 z-10 relative"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle Delete
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Customer Details Sheet */}
            <CustomerDetailsSheet
                customerId={selectedCustomerId}
                isOpen={!!selectedCustomerId}
                onClose={() => setSelectedCustomerId(null)}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add New Customer</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
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
                                <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
                                <input type="number" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                                <button type="submit" disabled={createCustomerMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
