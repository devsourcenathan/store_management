import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';

export class UpdateLandingContentDto {
    @IsString()
    @IsNotEmpty()
    heroTitle: string;

    @IsOptional()
    @IsString()
    heroSubtitle?: string;

    @IsOptional()
    @IsString()
    ctaText?: string;

    @IsOptional()
    @IsArray()
    sections?: any[];
}
