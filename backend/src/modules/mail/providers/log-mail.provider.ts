import { Injectable, Logger } from '@nestjs/common';
import {
    MailProviderInterface,
    EmailOptions,
    EmailResult,
} from './mail-provider.interface';
import { TemplateRendererService } from '../services/template-renderer.service';

@Injectable()
export class LogMailProvider implements MailProviderInterface {
    private readonly logger = new Logger(LogMailProvider.name);

    constructor(private readonly templateRenderer: TemplateRendererService) {
        this.logger.log('Log Mail Provider initialized (emails will be logged, not sent)');
    }

    async sendEmail(options: EmailOptions): Promise<EmailResult> {
        try {
            let html = options.html;

            // Render template if provided
            if (options.template) {
                html = await this.templateRenderer.renderTemplate(
                    options.template.name,
                    options.template.context,
                );
            }

            const preview = html
                ? html.substring(0, 200).replace(/<[^>]*>/g, '')
                : options.text?.substring(0, 200) || 'No content';

            this.logger.log(`
╔════════════════════════════════════════════════════════════════
║ 📧 EMAIL (LOG MODE - NOT SENT)
╠════════════════════════════════════════════════════════════════
║ To:      ${options.to}
║ Subject: ${options.subject}
║ From:    ${options.from ? `${options.from.name} <${options.from.email}>` : 'Default'}
║ Attachments: ${options.attachments?.length || 0}
╠════════════════════════════════════════════════════════════════
║ Preview:
║ ${preview}${preview.length >= 200 ? '...' : ''}
╚════════════════════════════════════════════════════════════════
            `);

            return {
                success: true,
                messageId: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                provider: this.getName(),
            };
        } catch (error) {
            this.logger.error('Failed to log email:', error);
            return {
                success: false,
                provider: this.getName(),
                error: error.message,
            };
        }
    }

    getName(): string {
        return 'log';
    }

    async isHealthy(): Promise<boolean> {
        // Log provider is always healthy
        return true;
    }
}
