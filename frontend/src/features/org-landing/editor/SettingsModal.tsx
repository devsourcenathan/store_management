// frontend/src/features/org-landing/editor/SettingsModal.tsx
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AuditHistory } from '../components/AuditHistory';
import { OrganizationLandingData } from '@/types/landing';

interface SettingsModalProps {
  children: React.ReactNode;
  onSubmit: (data: OrganizationLandingData) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ children, onSubmit }) => {
  const { register, watch, handleSubmit } = useFormContext<OrganizationLandingData>();
  const [activeTab, setActiveTab] = useState('general');

  const handleVerifyDomain = async () => {
    // This function can be re-implemented if needed, for now it's a placeholder
    alert('Domain verification logic to be implemented.');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Landing Page Settings</DialogTitle>
        </DialogHeader>
        <div className="flex-1 gap-6 overflow-hidden pt-4 flex">
          <aside className="w-48 flex-shrink-0">
            <div className="flex flex-col gap-2">
              {['general', 'domain', 'seo', 'history'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium text-left
                    ${activeTab === tab
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </aside>

          <main className="flex-1 space-y-6 overflow-y-auto pr-4">
            {activeTab === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>Basic details about your landing page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Page Title</Label>
                    <Input {...register('title')} placeholder="e.g. Acme Corp - Official Page" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input {...register('description')} placeholder="A brief description of your organization" />
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
                    <Label>Subdomain</Label>
                    <div className="flex items-center gap-2">
                      <Input {...register('subdomain')} placeholder="my-org" className="max-w-xs" />
                      <span className="text-muted-foreground">.stock-app.com</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Your default address: https://{watch('subdomain') || '...'}.stock-app.com</p>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="mb-1 block">Custom Domain</Label>
                    <div className="flex gap-2">
                      <Input {...register('customDomain')} placeholder="www.my-company.com" />
                      <Button variant="outline" onClick={handleVerifyDomain}>Verify</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      To use a custom domain, configure a CNAME record pointing to <code>domains.stock-app.com</code>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'seo' && (
              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>Customize appearance for search engines.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meta Title (SEO)</Label>
                    <Input {...register('themeConfig.metaTitle')} placeholder="Title for search engines" />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description (SEO)</Label>
                    <Input {...register('themeConfig.metaDescription')} placeholder="Description for search engines" />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'history' && (
              <AuditHistory />
            )}
          </main>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit(onSubmit)}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
