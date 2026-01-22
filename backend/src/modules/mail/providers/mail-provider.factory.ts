import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailProviderInterface, MailProvider } from './mail-provider.interface';
import { SesMailProvider } from './ses-mail.provider';
import { ResendMailProvider } from './resend-mail.provider';
import { LogMailProvider } from './log-mail.provider';

@Injectable()
export class MailProviderFactory {
    private readonly logger = new Logger(MailProviderFactory.name);
    private primaryProvider: MailProviderInterface;
    private fallbackProvider: MailProviderInterface;
    private readonly fallbackEnabled: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly sesProvider: SesMailProvider,
        private readonly resendProvider: ResendMailProvider,
        private readonly logProvider: LogMailProvider,
    ) {
        this.fallbackEnabled = this.configService.get('MAIL_FALLBACK_ENABLED') === 'true';
        this.initializeProviders();
    }

    private initializeProviders(): void {
        const primaryProviderName = this.configService.get<string>('MAIL_PROVIDER', 'ses');
        const fallbackProviderName = this.configService.get<string>('MAIL_FALLBACK_PROVIDER');

        this.primaryProvider = this.getProvider(primaryProviderName);

        if (this.fallbackEnabled && fallbackProviderName) {
            this.fallbackProvider = this.getProvider(fallbackProviderName);
            this.logger.log(
                `Mail providers initialized: Primary=${this.primaryProvider.getName()}, Fallback=${this.fallbackProvider.getName()}`,
            );
        } else {
            this.logger.log(`Mail provider initialized: ${this.primaryProvider.getName()}`);
        }
    }

    private getProvider(providerName: string): MailProviderInterface {
        switch (providerName.toLowerCase()) {
            case MailProvider.SES:
                return this.sesProvider;
            case MailProvider.RESEND:
                return this.resendProvider;
            case MailProvider.LOG:
                return this.logProvider;
            default:
                throw new Error(
                    `Unknown mail provider: ${providerName}. Valid options: ${Object.values(MailProvider).join(', ')}`,
                );
        }
    }

    /**
     * Get the primary mail provider
     */
    getPrimaryProvider(): MailProviderInterface {
        return this.primaryProvider;
    }

    /**
     * Get the fallback mail provider (if enabled)
     */
    getFallbackProvider(): MailProviderInterface | null {
        return this.fallbackProvider || null;
    }

    /**
     * Check if fallback is enabled
     */
    isFallbackEnabled(): boolean {
        return this.fallbackEnabled && !!this.fallbackProvider;
    }
}
