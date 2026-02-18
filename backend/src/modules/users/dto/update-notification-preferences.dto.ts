import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
    @IsBoolean()
    @IsOptional()
    emailNotificationsEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    dailyReportEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    weeklyReportEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    monthlyReportEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    yearlyReportEnabled?: boolean;
    @IsBoolean()
    @IsOptional()
    separateReportsByStore?: boolean;
}
