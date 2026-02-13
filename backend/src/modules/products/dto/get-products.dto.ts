
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortBy {
    NAME = 'name',
    PRICE = 'basePrice',
    CREATED_AT = 'createdAt',
    STOCK = 'stock' // Although stock is client-side calculated currently, we can start supporting basic sort. Maybe just stick to DB fields for now.
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc'
}

export class GetProductsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy;

    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    page?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    limit?: number;
}
