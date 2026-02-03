import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { BillingCycle, PlatformPlanType } from '@prisma/client';

export class CreatePlanDto {
    @IsString()
    name: string;

    @IsEnum(PlatformPlanType)
    type: PlatformPlanType;

    @IsNumber()
    monthlyPrice: number;

    @IsNumber()
    semiAnnualPrice: number;

    @IsNumber()
    annualPrice: number;

    @IsOptional()
    @IsNumber()
    maxStores?: number;

    @IsOptional()
    @IsNumber()
    maxProducts?: number;

    @IsOptional()
    @IsNumber()
    maxUsers?: number;

    @IsOptional()
    features?: Record<string, any>;

    @IsOptional()
    @IsNumber()
    trialDays?: number;
}

export class UpdatePlanDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(PlatformPlanType)
    type?: PlatformPlanType;

    @IsOptional()
    @IsNumber()
    monthlyPrice?: number;

    @IsOptional()
    @IsNumber()
    semiAnnualPrice?: number;

    @IsOptional()
    @IsNumber()
    annualPrice?: number;

    @IsOptional()
    @IsNumber()
    maxStores?: number;

    @IsOptional()
    @IsNumber()
    maxProducts?: number;

    @IsOptional()
    @IsNumber()
    maxUsers?: number;

    @IsOptional()
    features?: Record<string, any>;

    @IsOptional()
    @IsNumber()
    trialDays?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class SubscribeDto {
    @IsUUID()
    planId: string;

    @IsEnum(BillingCycle)
    billingCycle: BillingCycle;
}

export class AdminAssignSubscriptionDto {
    @IsUUID()
    organizationId: string;

    @IsUUID()
    planId: string;

    @IsOptional()
    @IsEnum(BillingCycle)
    billingCycle?: BillingCycle;

    @IsOptional()
    @IsBoolean()
    isLifetime?: boolean;

    @IsOptional()
    @IsBoolean()
    hideBillingUI?: boolean;
}

export class AdminUpdateSubscriptionDto {
    @IsOptional()
    @IsUUID()
    planId?: string;

    @IsOptional()
    @IsEnum(BillingCycle)
    billingCycle?: BillingCycle;

    @IsOptional()
    @IsBoolean()
    isLifetime?: boolean;

    @IsOptional()
    @IsBoolean()
    hideBillingUI?: boolean;

    @IsOptional()
    @IsNumber()
    extendDays?: number;
}
