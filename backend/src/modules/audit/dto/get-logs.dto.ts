import { IsOptional, IsString, IsInt, Min, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLogsDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    entity?: string;

    @IsOptional()
    @IsString()
    entityId?: string;

    @IsOptional()
    @IsString()
    action?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 50;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;
}

export class GetAuditStatsDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
