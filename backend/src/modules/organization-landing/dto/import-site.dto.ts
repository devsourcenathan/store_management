import { IsOptional, IsString } from 'class-validator';

export class ImportSiteDto {
    @IsOptional()
    @IsString()
    html?: string;

    @IsOptional()
    @IsString()
    css?: string;

    @IsOptional()
    @IsString()
    js?: string;
}
