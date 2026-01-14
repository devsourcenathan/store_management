import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';

export class UpdateOrgLandingDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    subdomain?: string;

    @IsOptional()
    @IsObject()
    themeConfig?: Record<string, any>;

    @IsOptional()
    @IsString()
    customDomain?: string;

    @IsOptional()
    @IsArray()
    sections?: any[];

}
