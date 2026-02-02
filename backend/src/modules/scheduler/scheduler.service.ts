import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { ReportsService } from '../reports/reports.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';

// Type for Organization with included users
type OrganizationWithUsers = Prisma.OrganizationGetPayload<{
    include: { users: true };
}>;

@Injectable()
export class SchedulerService implements OnModuleInit {
    private readonly logger = new Logger(SchedulerService.name);

    async onModuleInit() {
        this.logger.log('SchedulerService initialized');
        this.logger.log('Scheduled jobs: daily-sales-report (0 7 * * * Africa/Douala), weekly-sales-report (0 8 * * 1 Africa/Douala), monthly-sales-report (0 8 1 * * Africa/Douala)');
    }

    constructor(
        private readonly mailService: MailService,
        private readonly reportsService: ReportsService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Pause utility function
     * @param ms milliseconds to wait
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Daily report at 7:00 AM (for previous day)
    @Cron('0 7 * * *', {
        name: 'daily-sales-report',
        timeZone: 'Africa/Douala', // Cameroon timezone
    })
    async sendDailyReports() {
        this.logger.log('Starting daily reports generation...');

        try {
            // Get all organizations
            const organizations = await this.prisma.organization.findMany({
                include: {
                    users: {
                        where: {
                            role: UserRole.OWNER,
                            isActive: true,
                            emailNotificationsEnabled: true,
                            dailyReportEnabled: true,
                        },
                    },
                },
            }) as OrganizationWithUsers[];

            for (const org of organizations) {
                try {
                    // Generate report data
                    const reportData = await this.reportsService.generateDailyReport(org.id);

                    // Send to all active owners
                    for (const owner of org.users) {
                        if (owner.email) {
                            await this.mailService.sendDailyReport(
                                owner.email,
                                {
                                    ...reportData,
                                    organizationName: org.name,
                                    ownerName: `${owner.firstName} ${owner.lastName}`,
                                },
                                owner.locale || 'fr',
                                org.name
                            );
                            this.logger.log(`Daily report sent to ${owner.email} for ${org.name}`);

                            // Pause de 2 secondes après chaque email
                            await this.sleep(2000);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to send daily report for ${org.name}:`, error);
                }
            }

            this.logger.log('Daily reports completed');
        } catch (error) {
            this.logger.error('Failed to send daily reports:', error);
        }
    }

    // Weekly report every Monday at 8:00 AM
    @Cron('0 8 * * 1', {
        name: 'weekly-sales-report',
        timeZone: 'Africa/Douala',
    })
    async sendWeeklyReports() {
        this.logger.log('Starting weekly reports generation...');

        try {
            const organizations = await this.prisma.organization.findMany({
                include: {
                    users: {
                        where: {
                            role: { in: [UserRole.OWNER, UserRole.MANAGER] },
                            isActive: true,
                            emailNotificationsEnabled: true,
                            weeklyReportEnabled: true,
                        },
                    },
                },
            }) as OrganizationWithUsers[];

            for (const org of organizations) {
                try {
                    const reportData = await this.reportsService.generateWeeklyReport(org.id);

                    for (const user of org.users) {
                        if (user.email) {
                            await this.mailService.sendWeeklyReport(
                                user.email,
                                {
                                    ...reportData,
                                    organizationName: org.name,
                                    userName: `${user.firstName} ${user.lastName}`,
                                },
                                user.locale || 'fr',
                                org.name
                            );
                            this.logger.log(`Weekly report sent to ${user.email} for ${org.name}`);

                            // Pause de 2 secondes après chaque email
                            await this.sleep(2000);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to send weekly report for ${org.name}:`, error);
                }
            }

            this.logger.log('Weekly reports completed');
        } catch (error) {
            this.logger.error('Failed to send weekly reports:', error);
        }
    }

    // Monthly report on the 1st of each month at 8:00 AM
    @Cron('0 8 1 * *', {
        name: 'monthly-sales-report',
        timeZone: 'Africa/Douala',
    })
    async sendMonthlyReports() {
        this.logger.log('Starting monthly reports generation...');

        try {
            const organizations = await this.prisma.organization.findMany({
                include: {
                    users: {
                        where: {
                            role: UserRole.OWNER,
                            isActive: true,
                            emailNotificationsEnabled: true,
                            monthlyReportEnabled: true,
                        },
                    },
                },
            }) as OrganizationWithUsers[];

            for (const org of organizations) {
                try {
                    const reportData = await this.reportsService.generateMonthlyReport(org.id);

                    for (const owner of org.users) {
                        if (owner.email) {
                            await this.mailService.sendMonthlyReport(
                                owner.email,
                                {
                                    ...reportData,
                                    organizationName: org.name,
                                    ownerName: `${owner.firstName} ${owner.lastName}`,
                                },
                                owner.locale || 'fr',
                                org.name
                            );
                            this.logger.log(`Monthly report sent to ${owner.email} for ${org.name}`);

                            // Pause de 2 secondes après chaque email
                            await this.sleep(2000);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to send monthly report for ${org.name}:`, error);
                }
            }

            this.logger.log('Monthly reports completed');
        } catch (error) {
            this.logger.error('Failed to send monthly reports:', error);
        }
    }

    // Quarterly report on the 1st day of each quarter at 8:00 AM
    @Cron('0 8 1 1,4,7,10 *', {
        name: 'quarterly-sales-report',
        timeZone: 'Africa/Douala',
    })
    async sendQuarterlyReports() {
        this.logger.log('Starting quarterly reports generation...');

        try {
            const organizations = await this.prisma.organization.findMany({
                include: {
                    users: {
                        where: {
                            role: UserRole.OWNER,
                            isActive: true,
                        },
                    },
                },
            }) as OrganizationWithUsers[];

            for (const org of organizations) {
                try {
                    const reportData = await this.reportsService.generateQuarterlyReport(org.id);

                    for (const owner of org.users) {
                        if (owner.email) {
                            await this.mailService.sendQuarterlyReport(
                                owner.email,
                                {
                                    ...reportData,
                                    organizationName: org.name,
                                    ownerName: `${owner.firstName} ${owner.lastName}`,
                                },
                                owner.locale || 'fr'
                            );
                            this.logger.log(`Quarterly report sent to ${owner.email} for ${org.name}`);

                            // Pause de 2 secondes après chaque email
                            await this.sleep(2000);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to send quarterly report for ${org.name}:`, error);
                }
            }

            this.logger.log('Quarterly reports completed');
        } catch (error) {
            this.logger.error('Failed to send quarterly reports:', error);
        }
    }

    // Yearly report on January 1st at 8:00 AM
    @Cron('0 8 1 1 *', {
        name: 'yearly-sales-report',
        timeZone: 'Africa/Douala',
    })
    async sendYearlyReports() {
        this.logger.log('Starting yearly reports generation...');

        try {
            const organizations = await this.prisma.organization.findMany({
                include: {
                    users: {
                        where: {
                            role: UserRole.OWNER,
                            isActive: true,
                            emailNotificationsEnabled: true,
                            yearlyReportEnabled: true,
                        },
                    },
                },
            }) as OrganizationWithUsers[];

            for (const org of organizations) {
                try {
                    const reportData = await this.reportsService.generateYearlyReport(org.id);

                    for (const owner of org.users) {
                        if (owner.email) {
                            await this.mailService.sendYearlyReport(
                                owner.email,
                                {
                                    ...reportData,
                                    organizationName: org.name,
                                    ownerName: `${owner.firstName} ${owner.lastName}`,
                                },
                                owner.locale || 'fr',
                                org.name
                            );
                            this.logger.log(`Yearly report sent to ${owner.email} for ${org.name}`);

                            // Pause de 2 secondes après chaque email
                            await this.sleep(2000);
                        }
                    }
                } catch (error) {
                    this.logger.error(`Failed to send yearly report for ${org.name}:`, error);
                }
            }

            this.logger.log('Yearly reports completed');
        } catch (error) {
            this.logger.error('Failed to send yearly reports:', error);
        }
    }
}