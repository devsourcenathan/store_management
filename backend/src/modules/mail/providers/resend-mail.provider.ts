import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
    MailProviderInterface,
    EmailOptions,
    EmailResult,
} from './mail-provider.interface';
import { TemplateRendererService } from '../services/template-renderer.service';

@Injectable()
export class ResendMailProvider implements MailProviderInterface {
    private readonly logger = new Logger(ResendMailProvider.name);
    private resend: Resend;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly templateRenderer: TemplateRendererService,
    ) {
        this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
        this.fromName = this.configService.get<string>('RESEND_FROM_NAME');
        this.initializeResend();
    }

    private initializeResend(): void {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');

        if (!apiKey) {
            throw new Error('Missing required Resend API key (RESEND_API_KEY)');
        }

        this.resend = new Resend(apiKey);
        this.logger.log('Resend Mail Provider initialized');
    }

    async sendEmail(options: EmailOptions): Promise<EmailResult> {
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
                ? `${options.from.name} <${options.from.email}>`
                : `${this.fromName} <${this.fromEmail}>`;

            const emailData: any = {
                from,
                to: options.to,
                subject: options.subject,
                html,
                text,
            };

            // Add attachments if provided
            if (options.attachments && options.attachments.length > 0) {
                emailData.attachments = options.attachments.map((att) => ({
                    filename: att.filename,
                    content: att.content
                        ? Buffer.isBuffer(att.content)
                            ? att.content
                            : Buffer.from(att.content)
                        : undefined,
                    path: att.path,
                }));
            }

            const result = await this.resend.emails.send(emailData);

            if (result.error) {
                throw new Error(result.error.message);
            }

            this.logger.log(`Email sent via Resend to ${options.to} - ID: ${result.data.id}`);

            return {
                success: true,
                messageId: result.data.id,
                provider: this.getName(),
            };
        } catch (error) {
            this.logger.error(`Failed to send email via Resend to ${options.to}:`, error);
            return {
                success: false,
                provider: this.getName(),
                error: error.message,
            };
        }
    }

    getName(): string {
        return 'resend';
    }

    async isHealthy(): Promise<boolean> {
        try {
            // Resend doesn't have a dedicated health check endpoint
            // We'll just verify that the API key is set
            const apiKey = this.configService.get<string>('RESEND_API_KEY');
            return !!apiKey;
        } catch (error) {
            this.logger.error('Resend health check failed:', error);
            return false;
        }
    }
}
