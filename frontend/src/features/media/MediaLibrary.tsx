import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MediaGrid } from './components/MediaGrid';
import { MediaUpload } from './components/MediaUpload';
import { MediaFilters } from './components/MediaFilters';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { mediaService } from '@/services/mediaService';

export const MediaLibrary: React.FC = () => {
    const { t } = useTranslation();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [filters, setFilters] = useState<{
        entityType?: string;
        tags?: string;
    }>({});

    const { data: media, isLoading, refetch } = useQuery({
        queryKey: ['media', filters],
        queryFn: () => {
            const queryFilters = {
                entityType: filters.entityType,
                tags: filters.tags ? filters.tags.split(',').map(t => t.trim()) : undefined,
            };
            return mediaService.getAll(queryFilters);
        },
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ImageIcon className="h-6 w-6" />
                        {t('media.title')}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t('media.subtitle')}
                    </p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('media.upload')}
                </Button>
            </div>

            <MediaFilters filters={filters} onFiltersChange={setFilters} />

            <MediaGrid
                media={media}
                isLoading={isLoading}
                onMediaDeleted={refetch}
            />

            <Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <SheetContent className="sm:max-w-xl">
                    <SheetHeader>
                        <SheetTitle>{t('media.upload')}</SheetTitle>
                    </SheetHeader>
                    <MediaUpload
                        onUploadComplete={() => {
                            refetch();
                            setIsUploadOpen(false);
                        }}
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
};
