import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { MailProviderFactory } from './providers/mail-provider.factory';
import { EmailOptions } from './providers/mail-provider.interface';

interface LegacyEmailOptions {
    to: string;
    subject: string;
    template: string;
    context: any;
    attachments?: Array<{
        filename: string;
        path?: string;
        content?: Buffer;
    }>;
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly enableEmails: boolean;

    constructor(
        private readonly providerFactory: MailProviderFactory,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.enableEmails = this.configService.get('ENABLE_EMAILS') === 'true';
    }

    /**
     * Send an email with automatic fallback support
     */
    private async sendEmailWithFallback(options: EmailOptions): Promise<boolean> {
        if (!this.enableEmails) {
            this.logger.warn(`Emails are disabled. Would have sent email to ${options.to} with subject: ${options.subject}`);
            return true;
        }

        const primaryProvider = this.providerFactory.getPrimaryProvider();
        const result = await primaryProvider.sendEmail(options);

        if (result.success) {
            this.logger.log(`Email sent to ${options.to} via ${result.provider}`);
            return true;
        }

        // Try fallback if enabled
        if (this.providerFactory.isFallbackEnabled()) {
            const fallbackProvider = this.providerFactory.getFallbackProvider();
            this.logger.warn(
                `Primary provider (${primaryProvider.getName()}) failed, attempting fallback to ${fallbackProvider.getName()}`,
            );

            const fallbackResult = await fallbackProvider.sendEmail(options);

            if (fallbackResult.success) {
                this.logger.log(`Email sent to ${options.to} via fallback provider ${fallbackResult.provider}`);
                return true;
            }

            this.logger.error(
                `Both primary and fallback providers failed to send email to ${options.to}`,
            );
            return false;
        }

        this.logger.error(`Failed to send email to ${options.to}: ${result.error}`);
        return false;
    }

    /**
     * Legacy sendEmail method for backward compatibility
     */
    async sendEmail(options: LegacyEmailOptions): Promise<boolean> {
        const emailOptions: EmailOptions = {
            to: options.to,
            subject: options.subject,
            template: {
                name: options.template,
                context: options.context,
            },
            attachments: options.attachments,
        };

        return this.sendEmailWithFallback(emailOptions);
    }

    async sendDailyReport(to: string, reportData: any, lang: string = 'fr', organizationName?: string): Promise<boolean> {
        const t: any = await this.i18n.translate('mail.reports.daily', { lang });

        const emailOptions: LegacyEmailOptions = {
            to,
            subject: reportData.storeName
                ? `${t.title} - ${reportData.storeName} - ${reportData.date}`
                : `${t.title} - ${reportData.date}`,
            template: 'daily-report',
            context: { ...reportData, t },
        };

        // If organizationName is provided, use it as the from name
        if (organizationName) {
            const emailOptionsWithFrom: EmailOptions = {
                ...emailOptions,
                from: {
                    name: organizationName,
                    email: this.configService.get<string>('RESEND_FROM_EMAIL') || this.configService.get<string>('AWS_SES_FROM_EMAIL'),
                },
                template: {
                    name: emailOptions.template,
                    context: emailOptions.context,
                },
            };
            return this.sendEmailWithFallback(emailOptionsWithFrom);
        }

        return this.sendEmail(emailOptions);
    }

    async sendWeeklyReport(to: string, reportData: any, lang: string = 'fr', organizationName?: string): Promise<boolean> {
        const t: any = await this.i18n.translate('mail.reports.weekly', { lang });

        const emailOptions: LegacyEmailOptions = {
            to,
            subject: reportData.storeName
                ? `${t.title} - ${reportData.storeName} - ${reportData.week}`
                : `${t.title} - ${reportData.week}`,
            template: 'weekly-report',
            context: { ...reportData, t },
        };

        if (organizationName) {
            const emailOptionsWithFrom: EmailOptions = {
                ...emailOptions,
                from: {
                    name: organizationName,
                    email: this.configService.get<string>('RESEND_FROM_EMAIL') || this.configService.get<string>('AWS_SES_FROM_EMAIL'),
                },
                template: {
                    name: emailOptions.template,
                    context: emailOptions.context,
                },
            };
            return this.sendEmailWithFallback(emailOptionsWithFrom);
        }

        return this.sendEmail(emailOptions);
    }

    async sendMonthlyReport(to: string, reportData: any, lang: string = 'fr', organizationName?: string): Promise<boolean> {
        const emailOptions: LegacyEmailOptions = {
            to,
            subject: reportData.storeName
                ? `Monthly Sales Report - ${reportData.storeName} - ${reportData.month}`
                : `Monthly Sales Report - ${reportData.month}`,
            template: 'monthly-report',
            context: reportData,
        };

        if (organizationName) {
            const emailOptionsWithFrom: EmailOptions = {
                ...emailOptions,
                from: {
                    name: organizationName,
                    email: this.configService.get<string>('RESEND_FROM_EMAIL') || this.configService.get<string>('AWS_SES_FROM_EMAIL'),
                },
                template: {
                    name: emailOptions.template,
                    context: emailOptions.context,
                },
            };
            return this.sendEmailWithFallback(emailOptionsWithFrom);
        }

        return this.sendEmail(emailOptions);
    }

    async sendQuarterlyReport(to: string, reportData: any, lang: string = 'fr'): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: reportData.storeName
                ? `Quarterly Sales Report - ${reportData.storeName} - ${reportData.quarter}`
                : `Quarterly Sales Report - ${reportData.quarter}`,
            template: 'quarterly-report',
            context: reportData,
        });
    }

    async sendYearlyReport(to: string, reportData: any, lang: string = 'fr', organizationName?: string): Promise<boolean> {
        const emailOptions: LegacyEmailOptions = {
            to,
            subject: reportData.storeName
                ? `Annual Sales Report - ${reportData.storeName} - ${reportData.year}`
                : `Annual Sales Report - ${reportData.year}`,
            template: 'yearly-report',
            context: reportData,
        };

        if (organizationName) {
            const emailOptionsWithFrom: EmailOptions = {
                ...emailOptions,
                from: {
                    name: organizationName,
                    email: this.configService.get<string>('RESEND_FROM_EMAIL') || this.configService.get<string>('AWS_SES_FROM_EMAIL'),
                },
                template: {
                    name: emailOptions.template,
                    context: emailOptions.context,
                },
            };
            return this.sendEmailWithFallback(emailOptionsWithFrom);
        }

        return this.sendEmail(emailOptions);
    }

    async sendLowStockAlert(to: string, alertData: any, lang: string = 'fr'): Promise<boolean> {
        const t: any = await this.i18n.translate('mail.reports.daily', { lang }); // Fallback or specific translation
        return this.sendEmail({
            to,
            subject: `⚠️ Low Stock Alert: ${alertData.productName}`, // Can be translated
            template: 'low-stock-alert',
            context: alertData,
        });
    }

    async sendWelcomeEmail(to: string, data: any): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: 'Welcome to Stock Management',
            template: 'welcome',
            context: data,
        });
    }

    async sendPasswordResetEmail(to: string, data: any): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: 'Password Reset Request',
            template: 'password-reset',
            context: data,
        });
    }

    async sendInvoiceEmail(to: string, data: any, attachmentPath?: string): Promise<boolean> {
        const options: LegacyEmailOptions = {
            to,
            subject: `Invoice #${data.invoiceNumber}`,
            template: 'invoice',
            context: data,
        };

        if (attachmentPath) {
            options.attachments = [{
                path: attachmentPath,
                filename: `Invoice-${data.invoiceNumber}.pdf`
            }];
        }

        return this.sendEmail(options);
    }

    async sendBalanceAlert(to: string, alertData: any): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: `⚠️ Balance Alert: ${alertData.accountName}`,
            template: 'balance-alert',
            context: alertData,
        });
    }

    async sendPasswordReset(to: string, resetData: any): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: 'Your Password Has Been Reset',
            template: 'password-reset',
            context: resetData,
        });
    }

    async sendInvoice(to: string, invoiceData: any, pdfBuffer?: Buffer): Promise<boolean> {
        const attachments = pdfBuffer ? [{
            filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
            content: pdfBuffer,
        }] : undefined;

        return this.sendEmail({
            to,
            subject: `Invoice #${invoiceData.invoiceNumber}`,
            template: 'invoice',
            context: invoiceData,
            attachments,
        });
    }
}
