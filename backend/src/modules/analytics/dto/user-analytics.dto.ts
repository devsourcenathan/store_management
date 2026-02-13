import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PeriodType {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year',
    CUSTOM = 'custom'
}

export enum MetricType {
    SALES = 'sales',
    MAINTENANCE = 'maintenance',
    SUBSCRIPTIONS = 'subscriptions'
}

export class GetUserDashboardDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsEnum(PeriodType)
    period: PeriodType;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class GetUserStatsDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;
}

export class GetUserRankingsDto {
    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsEnum(PeriodType)
    period?: PeriodType;

    @IsOptional()
    @IsEnum(MetricType)
    metric?: MetricType;

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
    limit?: number = 10;
}
