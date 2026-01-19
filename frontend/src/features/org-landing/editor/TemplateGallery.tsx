// frontend/src/features/org-landing/editor/TemplateGallery.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { pageTemplates, availablePageTemplates } from './page-templates';

interface TemplateGalleryProps {
  onSelectTemplate: (template: any) => void;
  children: React.ReactNode;
}

const formatTemplateName = (name: string) => {
  return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate, children }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 overflow-y-auto">
          {availablePageTemplates.map((templateKey) => {
            const template = pageTemplates[templateKey as keyof typeof pageTemplates];
            return (
              <div key={templateKey} className="border rounded-lg overflow-hidden group">
                <div className="bg-gray-200 h-48 flex items-center justify-center">
                  <p className="text-gray-500">{formatTemplateName(templateKey)} Preview</p>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{formatTemplateName(templateKey)}</h3>
                  <p className="text-sm text-gray-500 h-10">{template.description}</p>
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to apply this template? This will replace your current content.')) {
                        onSelectTemplate(template);
                      }
                    }}
                  >
                    Apply Template
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
