import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MediaGrid } from './MediaGrid';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/Sheet';
import { Image as ImageIcon, Upload, Grid } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/apiBaseUrl';
import { mediaService, Media } from '@/services/mediaService';
import { MediaUpload } from './MediaUpload';

interface MediaSelectorProps {
    entityType: string;
    entityId: string;
    onSelect: (media: Media) => void;
    selectedMedia?: Media[];
    trigger?: React.ReactNode;
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
    entityType,
    entityId,
    onSelect,
    selectedMedia = [],
    trigger,
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'library' | 'upload'>('library');

    const { data: media, isLoading } = useQuery({
        queryKey: ['media-selector', entityType],
        queryFn: () => mediaService.getAll({ entityType }),
        enabled: open,
    });

    const handleSelect = (selectedItem: Media) => {
        onSelect(selectedItem);
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {t('media.select_image')}
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl md:max-w-3xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{t('media.select_image')}</SheetTitle>
                </SheetHeader>

                <div className="flex space-x-2 mt-4">
                    <Button
                        variant={mode === 'library' ? 'default' : 'outline'}
                        onClick={() => setMode('library')}
                        className="flex-1"
                    >
                        <Grid className="mr-2 h-4 w-4" />
                        {t('media.library')}
                    </Button>
                    <Button
                        variant={mode === 'upload' ? 'default' : 'outline'}
                        onClick={() => setMode('upload')}
                        className="flex-1"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        {t('media.upload')}
                    </Button>
                </div>

                <div className="mt-4">
                    {mode === 'library' ? (
                        <>
                            {selectedMedia.length > 0 && (
                                <div className="mb-4 p-4 bg-muted/40 rounded-lg border border-border">
                                    <h3 className="text-sm font-medium mb-3">{t('media.selected_images')} ({selectedMedia.length})</h3>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {selectedMedia.map((m) => (
                                            <div key={m.id} className="relative flex-shrink-0 w-20 h-20 group">
                                                <img
                                                    src={resolveMediaUrl(m.url)}
                                                    alt={m.alt || m.originalName}
                                                    className="w-full h-full object-cover rounded border border-border"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <MediaGrid
                                media={media}
                                isLoading={isLoading}
                                onMediaDeleted={() => { }}
                                onMediaSelect={handleSelect}
                                selectable={true}
                            />
                        </>
                    ) : (
                        <div className="max-w-xl mx-auto">
                            <MediaUpload
                                defaultEntityType={entityType}
                                defaultEntityId={entityId}
                                onUploadComplete={(uploadedMedia) => {
                                    if (uploadedMedia) {
                                        handleSelect(uploadedMedia);
                                    } else {
                                        setMode('library');
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
