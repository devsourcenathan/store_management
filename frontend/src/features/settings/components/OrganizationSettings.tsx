import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function OrganizationSettings() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        invoiceFooter: ''
    });

    const { data: org, isLoading } = useQuery({
        queryKey: ['organization'],
        queryFn: async () => {
            const res = await api.get('/organizations/me'); // Assuming endpoint exists
            return res.data;
        }
    });

    useEffect(() => {
        if (org) {
            setFormData({
                name: org.name || '',
                taxId: org.taxId || '',
                address: org.address || '',
                phone: org.phone || '',
                email: org.email || '',
                website: org.website || '',
                logoUrl: org.logoUrl || '',
                invoiceFooter: org.invoiceFooter || ''
            });
        }
    }, [org]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.put('/organizations/me', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization'] });
            toast.success(t('settings.org.success'));
        },
        onError: () => {
            toast.error(t('settings.org.error'));
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (isLoading) return <div>{t('common.loading')}</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('settings.org.title')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.company_name')}</label>
                        <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.tax_id')}</label>
                        <Input
                            name="taxId"
                            value={formData.taxId}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.address')}</label>
                        <Textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('settings.org.contact_title')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.phone')}</label>
                        <Input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.email')}</label>
                        <Input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.website')}</label>
                        <Input
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="https://example.com"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('settings.org.branding_title')}</h3>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.logo_url')}</label>
                        <Input
                            name="logoUrl"
                            value={formData.logoUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/logo.png"
                        />
                        {formData.logoUrl && (
                            <div className="mt-2 p-2 border rounded border-dashed border-gray-300 dark:border-gray-600 inline-block bg-white">
                                <img src={formData.logoUrl} alt="Logo Preview" className="h-16 object-contain" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.invoice_footer')}</label>
                        <Textarea
                            name="invoiceFooter"
                            value={formData.invoiceFooter}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Thank you for your business!"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="min-w-[120px]"
                >
                    {updateMutation.isPending ? t('settings.org.saving') : t('settings.org.save')}
                </Button>
            </div>
        </form>
    );
}
