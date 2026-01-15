// frontend/src/features/org-landing/editor/PublishMenu.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { OrganizationLandingData } from '@/types/landing';

interface PublishMenuProps {
  onSubmit: (data: OrganizationLandingData) => void;
}

export const PublishMenu: React.FC<PublishMenuProps> = ({ onSubmit }) => {
  const { handleSubmit, setValue, watch } = useFormContext<OrganizationLandingData>();
  const isPublished = watch('published');

  const handlePublish = () => {
    setValue('published', true);
    handleSubmit(onSubmit)();
  };

  const handleSaveDraft = () => {
    setValue('published', false);
    handleSubmit(onSubmit)();
  };

  return (
    <div className="flex items-center gap-2">
        <span 
            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
        >
            {isPublished ? 'Published' : 'Draft'}
        </span>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    Update
                    <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSaveDraft}>
                    Save as Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePublish}>
                    Publish Changes
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
};
