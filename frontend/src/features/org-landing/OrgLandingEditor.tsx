import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { PageEditor } from './editor';
import { OrganizationLandingData } from '@/types/landing';
import { SettingsModal } from './editor/SettingsModal';
import { TemplateGallery } from './editor/TemplateGallery';
import { PublishMenu } from './editor/PublishMenu';
import { ImportSiteDialog } from './editor/ImportSiteDialog';
import { ExportSiteDialog } from './editor/ExportSiteDialog';
import { CodeEditorDialog } from './editor/CodeEditorDialog';

export const OrgLandingEditor = () => {
    const { user } = useAuth();
    const methods = useForm<OrganizationLandingData>({
        defaultValues: {
            title: '',
            description: '',
            subdomain: '',
            customDomain: '',
            published: false,
            themeConfig: {
                primaryColor: '#3b82f6',
                fontFamily: 'Inter',
                metaTitle: '',
                metaDescription: '',
            },
            sections: [],
            organization: { name: '' },
        }
    });

    const { reset, getValues } = methods;

    const sections = methods.watch('sections');

    useEffect(() => {
        if (user?.organizationId) {
            api.get(`/org-landing/public/${user.organizationId}`)
                .then(res => {
                    if (res.data) {
                        const fetchedData: OrganizationLandingData = {
                            ...res.data,
                            themeConfig: res.data.themeConfig || { primaryColor: '#3b82f6', fontFamily: 'Inter' },
                            sections: res.data.sections || [],
                            organization: res.data.organization || { name: user.organizationName || '' },
                        };
                        reset(fetchedData);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch landing data for editor:", err);
                    toast.error('Failed to load landing page data for editing.');
                });
        }
    }, [user, reset]);

    const onSubmit = async (data: OrganizationLandingData) => {
        try {
            const payload = {
                title: data.title,
                description: data.description,
                subdomain: data.subdomain,
                customDomain: data.customDomain,
                themeConfig: data.themeConfig,
                sections: data.sections,
                published: data.published,
            };
            await api.put('/org-landing/me', payload);
            toast.success(`Page successfully ${data.published ? 'published' : 'saved as draft'}!`);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save landing page: ' + (error.response?.data?.message || error.message));
        }
    };

    const onSelectTemplate = (template: Partial<OrganizationLandingData>) => {
        const currentData = getValues();
        reset({
            ...currentData,
            ...template,
        });
        toast.success('Template applied! You can now customize it.');
    };

    return (
        <FormProvider {...methods}>
            <div className="flex flex-col h-full">
                <header className="flex justify-between items-center p-4 border-b bg-white">
                    <h2 className="text-xl font-bold tracking-tight">Landing Page Builder</h2>
                    <div className="flex items-center gap-4">
                        <ImportSiteDialog onImportSuccess={() => window.location.reload()}>
                            <Button variant="outline">Import Site</Button>
                        </ImportSiteDialog>
                        <ExportSiteDialog>
                            <Button variant="outline">Export</Button>
                        </ExportSiteDialog>
                        <CodeEditorDialog onSave={() => window.location.reload()}>
                            <Button variant="outline">Code Editor</Button>
                        </CodeEditorDialog>
                        <TemplateGallery onSelectTemplate={onSelectTemplate}>
                            <Button variant="outline">Templates</Button>
                        </TemplateGallery>
                        <SettingsModal onSubmit={onSubmit}>
                            <Button variant="outline">Settings</Button>
                        </SettingsModal>
                        <PublishMenu onSubmit={onSubmit} />
                    </div>
                </header>
                <div className="flex-1 overflow-hidden">
                    <PageEditor control={methods.control} sections={sections} />
                </div>
            </div>
        </FormProvider>
    );
};

