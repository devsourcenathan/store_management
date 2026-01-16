import { IsString, IsOptional, IsEmail, IsUrl, IsObject } from 'class-validator';

export class UpdateOrganizationDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;

    @IsOptional()
    @IsUrl({}, { message: 'Invalid URL format' })
    website?: string;

    @IsOptional()
    @IsString()
    taxId?: string;

    @IsOptional()
    @IsString()
    logoUrl?: string;

    @IsOptional()
    @IsString()
    footer?: string;

    @IsOptional()
    @IsObject()
    themeConfig?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        sidebarBg?: string;
        navbarBg?: string;
    };
}
