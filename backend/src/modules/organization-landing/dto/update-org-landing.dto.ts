import { IsOptional, IsString, IsArray, IsObject, IsBoolean } from 'class-validator';

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

    @IsOptional()
    @IsBoolean()
    published?: boolean;
}
