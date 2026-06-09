import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MediaUpload } from '@/features/media/components/MediaUpload';
import { useOrganization } from '@/contexts/OrganizationContext';
import { resolveMediaUrl } from '@/lib/apiBaseUrl';
import { Upload } from 'lucide-react';

export function OrganizationSettings() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { organization, refetch } = useOrganization();
    const [showLogoUpload, setShowLogoUpload] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        footer: '',
        themeConfig: {
            primaryColor: '',
            secondaryColor: '',
            accentColor: '',
            sidebarBgLight: '',
            sidebarBgDark: '',
            navbarBgLight: '',
            navbarBgDark: ''
        }
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
                footer: org.footer || '',
                themeConfig: org.themeConfig || {
                    primaryColor: '',
                    secondaryColor: '',
                    accentColor: '',
                    sidebarBgLight: '',
                    sidebarBgDark: '',
                    navbarBgLight: '',
                    navbarBgDark: ''
                }
            });
        }
    }, [org]);

    const handleLogoUpload = async (media: any) => {
        if (media?.url) {
            try {
                // Immediately save the logo URL to the backend
                await api.put('/organizations/me', { logoUrl: media.url });

                // Update local state
                setFormData(prev => ({ ...prev, logoUrl: media.url }));
                setShowLogoUpload(false);

                // Invalidate queries to refresh data
                queryClient.invalidateQueries({ queryKey: ['organization'] });

                // Refetch organization context to update logo everywhere
                await refetch();

                toast.success(t('settings.org.logo_uploaded'));
            } catch (error) {
                console.error('Failed to save logo:', error);
                toast.error(t('settings.org.logo_upload_error', 'Failed to save logo'));
            }
        }
    };

    const handleThemeColorChange = (colorKey: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            themeConfig: {
                ...prev.themeConfig,
                [colorKey]: value
            }
        }));
    };

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.put('/organizations/me', data),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['organization'] });
            await refetch(); // Refetch organization context
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
        // Filter out empty email and website to avoid validation errors
        const dataToSubmit = { ...formData };
        const finalData: any = {};

        // Only include non-empty values
        Object.entries(dataToSubmit).forEach(([key, value]) => {
            if (key === 'email' || key === 'website') {
                // Only include email and website if they have values
                if (value) {
                    finalData[key] = value;
                }
            } else {
                finalData[key] = value;
            }
        });

        updateMutation.mutate(finalData);
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
                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.logo')}</Label>

                        {formData.logoUrl ? (
                            <div className="flex items-center gap-4">
                                <div className="p-4 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                                    <img src={resolveMediaUrl(formData.logoUrl)} alt="Logo" className="h-20 w-20 object-contain" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowLogoUpload(true)}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {t('settings.org.change_logo')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                                    >
                                        {t('settings.org.remove_logo')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowLogoUpload(true)}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {t('settings.org.upload_logo')}
                            </Button>
                        )}

                        {showLogoUpload && (
                            <div className="mt-4 p-4 border rounded border-gray-300 dark:border-gray-600">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium">{t('settings.org.upload_logo')}</h4>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowLogoUpload(false)}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                                <MediaUpload
                                    onUploadComplete={handleLogoUpload}
                                    defaultEntityType="ORGANIZATION"
                                    defaultEntityId={organization?.id || ''}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.org.invoice_footer')}</Label>
                        <Textarea
                            name="footer"
                            value={formData.footer}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Thank you for your business!"
                        />
                    </div>
                </div>
            </div>

            {/* Theme Colors */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('settings.org.theme_title')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.org.theme_description')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>{t('settings.org.primary_color')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.primaryColor || '#3b82f6'}
                                onChange={(e) => handleThemeColorChange('primaryColor', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.primaryColor || ''}
                                onChange={(e) => handleThemeColorChange('primaryColor', e.target.value)}
                                placeholder="#3b82f6"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.org.secondary_color')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.secondaryColor || '#6366f1'}
                                onChange={(e) => handleThemeColorChange('secondaryColor', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.secondaryColor || ''}
                                onChange={(e) => handleThemeColorChange('secondaryColor', e.target.value)}
                                placeholder="#6366f1"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.org.accent_color')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.accentColor || '#8b5cf6'}
                                onChange={(e) => handleThemeColorChange('accentColor', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.accentColor || ''}
                                onChange={(e) => handleThemeColorChange('accentColor', e.target.value)}
                                placeholder="#8b5cf6"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.org.sidebar_bg_light')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.sidebarBgLight || '#f9fafb'}
                                onChange={(e) => handleThemeColorChange('sidebarBgLight', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.sidebarBgLight || ''}
                                onChange={(e) => handleThemeColorChange('sidebarBgLight', e.target.value)}
                                placeholder="#f9fafb"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.org.sidebar_bg_dark')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.sidebarBgDark || '#1f2937'}
                                onChange={(e) => handleThemeColorChange('sidebarBgDark', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.sidebarBgDark || ''}
                                onChange={(e) => handleThemeColorChange('sidebarBgDark', e.target.value)}
                                placeholder="#1f2937"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.org.navbar_bg_light')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.navbarBgLight || '#ffffff'}
                                onChange={(e) => handleThemeColorChange('navbarBgLight', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.navbarBgLight || ''}
                                onChange={(e) => handleThemeColorChange('navbarBgLight', e.target.value)}
                                placeholder="#ffffff"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.org.navbar_bg_dark')}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.themeConfig.navbarBgDark || '#1f2937'}
                                onChange={(e) => handleThemeColorChange('navbarBgDark', e.target.value)}
                                className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={formData.themeConfig.navbarBgDark || ''}
                                onChange={(e) => handleThemeColorChange('navbarBgDark', e.target.value)}
                                placeholder="#1f2937"
                            />
                        </div>
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
