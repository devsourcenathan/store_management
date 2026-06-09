import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { resolveMediaUrl } from '@/lib/apiBaseUrl';
import { toast } from 'sonner';
import { mediaService, Media } from '@/services/mediaService';

interface MediaGridProps {
    media?: Media[];
    isLoading: boolean;
    onMediaDeleted: () => void;
    onMediaSelect?: (media: Media) => void;
    selectable?: boolean;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
    media,
    isLoading,
    onMediaDeleted,
    onMediaSelect,
    selectable = false,
}) => {
    const { t } = useTranslation();
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await mediaService.delete(id);
        },
        onSuccess: () => {
            toast.success(t('media.delete_success'));
            onMediaDeleted();
        },
        onError: () => {
            toast.error(t('media.delete_error'));
        },
    });

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-2 text-muted-foreground">{t('common.loading')}</p>
            </div>
        );
    }

    if (!media || media.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-muted-foreground">{t('media.no_media')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('media.no_media_desc')}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {media.map((item) => (
                <Card
                    key={item.id}
                    className={`overflow-hidden ${selectable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
                    onClick={() => selectable && onMediaSelect?.(item)}
                >
                    <div className="aspect-square relative group">
                        <img
                            src={resolveMediaUrl(item.url)}
                            alt={item.alt || item.originalName}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {selectable && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMediaSelect?.(item);
                                    }}
                                >
                                    <LinkIcon className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(item.url, '_blank');
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(t('media.delete_confirm'))) {
                                        deleteMutation.mutate(item.id);
                                    }
                                }}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="p-3">
                        <p className="text-sm font-medium truncate" title={item.originalName}>
                            {item.originalName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {(item.size / 1024).toFixed(2)} KB
                        </p>
                        {item.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                                {item.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                        {tag}
                                    </span>
                                ))}
                                {item.tags.length > 3 && (
                                    <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    );
};
