export interface MailProviderInterface {
    /**
     * Send an email using this provider
     */
    sendEmail(options: EmailOptions): Promise<EmailResult>;

    /**
     * Get the name of this provider
     */
    getName(): string;

    /**
     * Check if the provider is healthy and ready to send emails
     */
    isHealthy(): Promise<boolean>;
}

export interface EmailOptions {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: {
        name: string;
        email: string;
    };
    attachments?: EmailAttachment[];
    template?: {
        name: string;
        context: any;
    };
}

export interface EmailAttachment {
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    provider: string;
    error?: string;
}

export enum MailProvider {
    SES = 'ses',
    RESEND = 'resend',
    LOG = 'log',
}
