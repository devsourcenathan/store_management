import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { mediaService } from '@/services/mediaService';

interface MediaUploadProps {
    onUploadComplete: (media?: any) => void;
    defaultEntityType?: string;
    defaultEntityId?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
    onUploadComplete,
    defaultEntityType = 'OTHER',
    defaultEntityId = '',
}) => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState({
        entityType: defaultEntityType,
        entityId: defaultEntityId,
        alt: '',
        tags: '',
        isPublic: false,
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error('No file selected');

            return mediaService.upload(
                file,
                metadata.entityType,
                metadata.entityId,
                {
                    alt: metadata.alt,
                    tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [],
                    isPublic: metadata.isPublic,
                }
            );
        },
        onSuccess: (data) => {
            toast.success(t('media.upload_success'));
            onUploadComplete(data);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || t('media.upload_error'));
        },
    });

    return (
        <div className="space-y-4 mt-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
            >
                <input {...getInputProps()} />
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="h-16 w-16 object-cover rounded"
                            />
                            <div className="text-left">
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {isDragActive
                                ? t('media.drop_here')
                                : t('media.drag_drop')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF</p>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div>
                    <Label>{t('media.entity_type')}</Label>
                    <Select
                        value={metadata.entityType}
                        onValueChange={(value) => setMetadata({ ...metadata, entityType: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PRODUCT">{t('media.types.PRODUCT')}</SelectItem>
                            <SelectItem value="ORGANIZATION">{t('media.types.ORGANIZATION')}</SelectItem>
                            <SelectItem value="STORE">{t('media.types.STORE')}</SelectItem>
                            <SelectItem value="LANDING_PAGE">{t('media.types.LANDING_PAGE')}</SelectItem>
                            <SelectItem value="CATEGORY">{t('media.types.CATEGORY')}</SelectItem>
                            <SelectItem value="SERVICE">{t('media.types.SERVICE')}</SelectItem>
                            <SelectItem value="OFFER">{t('media.types.OFFER')}</SelectItem>
                            <SelectItem value="OTHER">{t('media.types.OTHER')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>{t('media.entity_id')}</Label>
                    <Input
                        value={metadata.entityId}
                        onChange={(e) => setMetadata({ ...metadata, entityId: e.target.value })}
                        placeholder={t('media.entity_id_placeholder')}
                    />
                </div>

                <div>
                    <Label>{t('media.alt_text')}</Label>
                    <Input
                        value={metadata.alt}
                        onChange={(e) => setMetadata({ ...metadata, alt: e.target.value })}
                        placeholder={t('media.alt_text_placeholder')}
                    />
                </div>

                <div>
                    <Label>{t('media.tags')}</Label>
                    <Input
                        value={metadata.tags}
                        onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
                        placeholder={t('media.tags_placeholder')}
                    />
                </div>
            </div>

            <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending}
                className="w-full"
            >
                {uploadMutation.isPending ? t('media.uploading') : t('media.upload_button')}
            </Button>
        </div>
    );
};
