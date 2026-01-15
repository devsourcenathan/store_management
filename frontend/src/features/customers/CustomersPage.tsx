import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('customers.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('customers.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                    {t('customers.add_customer')}
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder={t('common.search', 'Search') + "..."}
                    className="w-full pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Customers Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                    ) : filteredCustomers?.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">{t('customers.no_customers')}</div>
                    ) : (
                        filteredCustomers?.map((customer) => (
                            <div key={customer.id} onClick={() => setSelectedCustomerId(customer.id)} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{customer.name}</h3>
                                        {customer.email && <p className="text-xs text-gray-500 dark:text-gray-400">{customer.email}</p>}
                                        {customer.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Credit Limit</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{customer.creditLimit} F</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Current Credit</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{customer.currentCredit} F</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.phone')} / {t('common.email')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('customers.credit_limit', 'Credit Limit')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('customers.current_credit', 'Current Credit')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center dark:text-gray-400">{t('common.loading')}</td></tr>
                            ) : filteredCustomers?.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('customers.no_customers')}</td></tr>
                            ) : (
                                filteredCustomers?.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedCustomerId(customer.id)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{customer.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {customer.email && <div>{customer.email}</div>}
                                            {customer.phone && <div>{customer.phone}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.creditLimit} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.currentCredit} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3 z-10 relative"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Handle Edit
                                                }}
                                            >
                                                {t('common.edit')}
                                            </button>
                                            <button
                                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 z-10 relative"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Handle Delete
                                                }}
                                            >
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

            {/* Customer Details Sheet */}
            <CustomerDetailsSheet
                customerId={selectedCustomerId}
                isOpen={!!selectedCustomerId}
                onClose={() => setSelectedCustomerId(null)}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t('customers.add_customer')}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label>
                                <input type="text" required className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label>
                                <input type="email" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label>
                                <input type="text" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('customers.credit_limit', 'Credit Limit')}</label>
                                <input type="number" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                                <button type="submit" disabled={createCustomerMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    {createCustomerMutation.isPending ? t('common.processing') : t('customers.add_customer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
