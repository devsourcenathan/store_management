import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

interface EmailOptions {
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
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.enableEmails = this.configService.get('ENABLE_EMAILS') === 'true';
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.enableEmails) {
            this.logger.warn(`Emails are disabled. Would have sent email to ${options.to} with subject: ${options.subject}`);
            return true;
        }

        try {
            await this.mailerService.sendMail({
                to: options.to,
                subject: options.subject,
                template: `./${options.template}`,
                context: options.context,
                attachments: options.attachments,
            });
            this.logger.log(`Email sent to ${options.to}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email to ${options.to}:`, error);
            return false;
        }
    }

    async sendDailyReport(to: string, reportData: any, lang: string = 'fr'): Promise<boolean> {
        const t: any = await this.i18n.translate('mail.reports.daily', { lang });
        return this.sendEmail({
            to,
            subject: `${t.title} - ${reportData.date}`,
            template: 'daily-report',
            context: { ...reportData, t },
        });
    }

    async sendWeeklyReport(to: string, reportData: any, lang: string = 'fr'): Promise<boolean> {
        const t: any = await this.i18n.translate('mail.reports.weekly', { lang });
        return this.sendEmail({
            to,
            subject: `${t.title} - ${reportData.week}`,
            template: 'weekly-report',
            context: { ...reportData, t },
        });
    }

    async sendMonthlyReport(to: string, reportData: any, lang: string = 'fr'): Promise<boolean> {
        // Placeholder for monthly report translation if needed
        return this.sendEmail({
            to,
            subject: `Monthly Sales Report - ${reportData.month}`,
            template: 'monthly-report',
            context: reportData,
        });
    }

    async sendQuarterlyReport(to: string, reportData: any, lang: string = 'fr'): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: `Quarterly Sales Report - ${reportData.quarter}`,
            template: 'quarterly-report',
            context: reportData,
        });
    }

    async sendYearlyReport(to: string, reportData: any, lang: string = 'fr'): Promise<boolean> {
        return this.sendEmail({
            to,
            subject: `Annual Sales Report - ${reportData.year}`,
            template: 'yearly-report',
            context: reportData,
        });
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
        const options: any = {
            to,
            subject: `Invoice #${data.invoiceNumber}`,
            template: 'invoice',
            context: data,
        };

        if (attachmentPath) {
            try {
                await this.mailerService.sendMail({
                    ...options,
                    template: `./${options.template}`,
                    attachments: [{
                        path: attachmentPath,
                        filename: `Invoice-${data.invoiceNumber}.pdf`
                    }]
                });
                this.logger.log(`Invoice sent to ${to}`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send invoice to ${to}`, error);
                return false;
            }
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

        // Use mailerService directly for attachments if needed or ensure sendEmail handles it.
        // Since we updated sendEmail to handle attachments, we can use it.
        return this.sendEmail({
            to,
            subject: `Invoice #${invoiceData.invoiceNumber}`,
            template: 'invoice',
            context: invoiceData,
            attachments,
        });
    }
}
