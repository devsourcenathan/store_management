import { api } from '@/services/api';

export interface Media {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    alt?: string;
    entityType: 'PRODUCT' | 'ORGANIZATION' | 'STORE' | 'LANDING_PAGE' | 'CATEGORY' | 'OTHER';
    entityId: string;
    organizationId: string;
    uploadedBy: string;
    isPublic: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface MediaFilters {
    entityType?: string;
    entityId?: string;
    tags?: string[];
}

export const mediaService = {
    async upload(
        file: File,
        entityType: string,
        entityId: string,
        metadata?: { alt?: string; tags?: string[]; isPublic?: boolean }
    ): Promise<Media> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', entityType);
        formData.append('entityId', entityId);

        if (metadata?.alt) formData.append('alt', metadata.alt);
        if (metadata?.tags) formData.append('tags', metadata.tags.join(','));
        if (metadata?.isPublic !== undefined) formData.append('isPublic', metadata.isPublic.toString());

        const response = await api.post('/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async getAll(filters?: MediaFilters): Promise<Media[]> {
        const params = new URLSearchParams();
        if (filters?.entityType) params.append('entityType', filters.entityType);
        if (filters?.entityId) params.append('entityId', filters.entityId);
        if (filters?.tags) params.append('tags', filters.tags.join(','));

        const response = await api.get(`/media?${params.toString()}`);
        return response.data;
    },

    async getByEntity(entityType: string, entityId: string): Promise<Media[]> {
        const response = await api.get(`/media/entity/${entityType}/${entityId}`);
        return response.data;
    },

    async getOne(id: string): Promise<Media> {
        const response = await api.get(`/media/${id}`);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/media/${id}`);
    },

    async updateMetadata(id: string, metadata: { alt?: string; tags?: string[] }): Promise<Media> {
        const response = await api.patch(`/media/${id}`, metadata);
        return response.data;
    },

    async linkToEntity(id: string, entityType: string, entityId: string): Promise<Media> {
        const response = await api.patch(`/media/${id}/link`, { entityType, entityId });
        return response.data;
    },
};
