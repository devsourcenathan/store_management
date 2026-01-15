export interface CreateMediaDto {
    entityType: 'PRODUCT' | 'ORGANIZATION' | 'STORE' | 'LANDING_PAGE' | 'CATEGORY' | 'OTHER';
    entityId: string;
    alt?: string;
    tags?: string[];
    isPublic?: boolean;
}

export interface UpdateMediaMetadataDto {
    alt?: string;
    tags?: string[];
}

export interface LinkMediaDto {
    entityType: 'PRODUCT' | 'ORGANIZATION' | 'STORE' | 'LANDING_PAGE' | 'CATEGORY' | 'OTHER';
    entityId: string;
}

export interface MediaFilterDto {
    entityType?: 'PRODUCT' | 'ORGANIZATION' | 'STORE' | 'LANDING_PAGE' | 'CATEGORY' | 'OTHER';
    entityId?: string;
    tags?: string[];
}
