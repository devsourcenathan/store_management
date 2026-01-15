import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface MediaFiltersProps {
    filters: {
        entityType?: string;
        tags?: string;
    };
    onFiltersChange: (filters: any) => void;
}

export const MediaFilters: React.FC<MediaFiltersProps> = ({ filters, onFiltersChange }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>{t('media.entity_type')}</Label>
                    <Select
                        value={filters.entityType || 'ALL'}
                        onValueChange={(value) =>
                            onFiltersChange({
                                ...filters,
                                entityType: value === 'ALL' ? undefined : value
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('media.all_types')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t('media.all_types')}</SelectItem>
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
                    <Label>{t('media.filter_tags')}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={filters.tags || ''}
                            onChange={(e) => onFiltersChange({ ...filters, tags: e.target.value })}
                            placeholder={t('media.filter_tags')}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
