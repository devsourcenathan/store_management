import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProviderFactory } from './providers/mail-provider.factory';

@Controller('mail')
export class MailController {
    private readonly logger = new Logger(MailController.name);

    constructor(
        private readonly mailService: MailService,
        private readonly providerFactory: MailProviderFactory,
    ) { }

    @Get('provider-info')
    getProviderInfo() {
        const primary = this.providerFactory.getPrimaryProvider();
        const fallback = this.providerFactory.getFallbackProvider();
        const fallbackEnabled = this.providerFactory.isFallbackEnabled();

        return {
            primaryProvider: primary.getName(),
            fallbackProvider: fallback?.getName() || null,
            fallbackEnabled,
        };
    }

    @Get('health')
    async checkHealth() {
        const primary = this.providerFactory.getPrimaryProvider();
        const fallback = this.providerFactory.getFallbackProvider();

        const primaryHealth = await primary.isHealthy();
        const fallbackHealth = fallback ? await fallback.isHealthy() : null;

        return {
            primary: {
                name: primary.getName(),
                healthy: primaryHealth,
            },
            fallback: fallback ? {
                name: fallback.getName(),
                healthy: fallbackHealth,
            } : null,
        };
    }

    @Post('test')
    async sendTestEmail(@Body() body: { to: string; provider?: string }) {
        try {
            const result = await this.mailService.sendWelcomeEmail(body.to, {
                userName: 'Test User',
                appName: 'Stock Management',
            });

            return {
                success: result,
                message: result ? 'Test email sent successfully' : 'Failed to send test email',
            };
        } catch (error) {
            this.logger.error('Error sending test email:', error);
            return {
                success: false,
                message: error.message,
            };
        }
    }
}
