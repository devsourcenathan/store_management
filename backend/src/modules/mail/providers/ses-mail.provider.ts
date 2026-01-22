import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
    MailProviderInterface,
    EmailOptions,
    EmailResult,
} from './mail-provider.interface';
import { TemplateRendererService } from '../services/template-renderer.service';

@Injectable()
export class SesMailProvider implements MailProviderInterface {
    private readonly logger = new Logger(SesMailProvider.name);
    private transporter: Transporter;
    private readonly fromEmail: string;
    private readonly fromName: string;
    private isConfigured = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly templateRenderer: TemplateRendererService,
    ) {
        this.fromEmail = this.configService.get<string>('AWS_SES_FROM_EMAIL');
        this.fromName = this.configService.get<string>('AWS_SES_FROM_NAME');
        this.initializeTransporter();
    }

    private initializeTransporter(): void {
        const region = this.configService.get<string>('AWS_REGION');
        const username = this.configService.get<string>('AWS_SES_SMTP_USERNAME');
        const password = this.configService.get<string>('AWS_SES_SMTP_PASSWORD');

        if (!region || !username || !password) {
            this.logger.warn('AWS SES configuration missing. SES provider will be disabled.');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: `email-smtp.${region}.amazonaws.com`,
            port: 587,
            secure: false,
            auth: {
                user: username,
                pass: password,
            },
        });

        this.isConfigured = true;
        this.logger.log('SES Mail Provider initialized');
    }

    async sendEmail(options: EmailOptions): Promise<EmailResult> {
        if (!this.isConfigured) {
            return {
                success: false,
                provider: this.getName(),
                error: 'AWS SES is not configured',
            };
        }

        try {
            let html = options.html;
            let text = options.text;

            // Render template if provided
            if (options.template) {
                html = await this.templateRenderer.renderTemplate(
                    options.template.name,
                    options.template.context,
                );
            }

            const from = options.from
                ? `"${options.from.name}" <${options.from.email}>`
                : `"${this.fromName}" <${this.fromEmail}>`;

            const mailOptions = {
                from,
                to: options.to,
                subject: options.subject,
                html,
                text,
                attachments: options.attachments?.map((att) => ({
                    filename: att.filename,
                    path: att.path,
                    content: att.content,
                    contentType: att.contentType,
                })),
            };

            const info = await this.transporter.sendMail(mailOptions);

            this.logger.log(`Email sent via SES to ${options.to} - MessageId: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId,
                provider: this.getName(),
            };
        } catch (error) {
            this.logger.error(`Failed to send email via SES to ${options.to}:`, error);
            return {
                success: false,
                provider: this.getName(),
                error: error.message,
            };
        }
    }

    getName(): string {
        return 'ses';
    }

    async isHealthy(): Promise<boolean> {
        if (!this.isConfigured) {
            return false;
        }
        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            this.logger.error('SES health check failed:', error);
            return false;
        }
    }
}
