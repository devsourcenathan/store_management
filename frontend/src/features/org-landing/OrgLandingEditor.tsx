import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/features/auth/useAuth';
import { api } from '@/services/api';
import { AuditHistory } from './components/AuditHistory';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';


interface Section {
    title: string;
    content: string;
    imageUrl: string;
}

interface LandingForm {
    title: string;
    description: string;
    subdomain: string;
    customDomain: string;
    themeConfig: {
        primaryColor: string;
        fontFamily: string;
        metaTitle: string;
        metaDescription: string;
    };
    sections: Section[];
}

export const OrgLandingEditor = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const { register, control, handleSubmit, reset, watch, setValue } = useForm<LandingForm>({
        defaultValues: {
            title: '',
            description: '',
            subdomain: '',
            customDomain: '',
            themeConfig: {
                primaryColor: '#3b82f6',
                fontFamily: 'Inter',
                metaTitle: '',
                metaDescription: ''
            },
            sections: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "sections"
    });

    useEffect(() => {
        if (user?.organizationId) {
            api.get(`/org-landing/public/${user.organizationId}`)
                .then(res => {
                    if (res.data) reset(res.data);
                })
                .catch(err => console.error(err));
        }
    }, [user, reset]);

    const onSubmit = async (data: any) => {
        try {
            await api.put('/org-landing/me', data);
            toast.success('Settings saved successfully!');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save settings: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleVerifyDomain = async () => {
        const domain = watch('customDomain');
        if (!domain) return;

        try {
            const res = await api.get('/org-landing/verify-domain', { params: { domain } });
            if (res.data.verified) {
                toast.success('Success: ' + res.data.message);
            } else {
                toast.error('Verification Failed: ' + res.data.message);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Error checking domain: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Landing Page Settings</h2>
                    <p className="text-gray-500">Customize your organization's public presence.</p>
                </div>
                <Button onClick={handleSubmit(onSubmit)}>Save Changes</Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                <aside className="w-full md:w-64 flex overflow-x-auto md:flex-col gap-2 md:space-y-1 pb-4 md:pb-0">
                    {['general', 'sections', 'theme', 'domain', 'history'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg transition-colors text-sm font-medium
                                ${activeTab === tab
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                                } md:text-left w-auto md:w-full`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </aside>

                <main className="flex-1 space-y-6">
                    {activeTab === 'general' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>General Information</CardTitle>
                                <CardDescription>Basic details about your landing page.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Page Title</label>
                                    <Input {...register('title')} placeholder="e.g. Acme Corp - Official Page" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input {...register('description')} placeholder="A brief description of your organization" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'sections' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Content Sections</h3>
                                <Button size="sm" onClick={() => append({ title: 'New Section', content: '', imageUrl: '' })}>
                                    + Add Section
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <Card key={field.id} className="relative">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base">Section {index + 1}</CardTitle>
                                            <Button variant="ghost" size="sm" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                                                Remove
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Section Title</label>
                                                <Input {...register(`sections.${index}.title`)} placeholder="Title" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Image URL</label>
                                                <Input {...register(`sections.${index}.imageUrl`)} placeholder="https://..." />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Content</label>
                                            <div className="bg-white text-black rounded-md">
                                                <ReactQuill
                                                    theme="snow"
                                                    value={watch(`sections.${index}.content`)}
                                                    onChange={(val: string) => setValue(`sections.${index}.content`, val)}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {fields.length === 0 && (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                    No sections added yet. Add one to showcase your organization features.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Theme & SEO</CardTitle>
                                <CardDescription>Customize appearance and search engine visibility.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Primary Color</label>
                                        <div className="flex gap-2">
                                            <Input type="color" {...register('themeConfig.primaryColor')} className="w-12 h-10 p-1" />
                                            <Input {...register('themeConfig.primaryColor')} placeholder="#000000" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Font Family</label>
                                        <Input {...register('themeConfig.fontFamily')} placeholder="Inter, sans-serif" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Meta Title (SEO)</label>
                                    <Input {...register('themeConfig.metaTitle')} placeholder="Title for search engines" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Meta Description (SEO)</label>
                                    <Input {...register('themeConfig.metaDescription')} placeholder="Description for search engines" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'domain' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Domain Settings</CardTitle>
                                <CardDescription>Configure how users access your landing page.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subdomain</label>
                                    <div className="flex items-center gap-2">
                                        <Input {...register('subdomain')} placeholder="my-org" className="max-w-xs" />
                                        <span className="text-slate-500">.stock-app.com</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Your default address: https://{watch('subdomain') || '...'}.stock-app.com</p>
                                </div>

                                <div className="pt-4 border-t">
                                    <label className="text-sm font-medium mb-1 block">Custom Domain</label>
                                    <div className="flex gap-2">
                                        <Input {...register('customDomain')} placeholder="www.my-company.com" />
                                        <Button variant="outline" onClick={handleVerifyDomain}>Verify</Button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        To use a custom domain, configure a CNAME record pointing to <code>domains.stock-app.com</code>.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'history' && (
                        <AuditHistory />
                    )}
                </main>
            </div>
        </div>
    );
};
