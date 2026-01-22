# Multi-Provider Email System

## Overview

The email system supports multiple email providers with automatic fallback capability. You can switch between providers using environment variables without changing any code.

## Supported Providers

- **SES** - Amazon Simple Email Service (SMTP)
- **Resend** - Modern email API service
- **Log** - Debug mode (logs emails instead of sending)

## Configuration

### Environment Variables

```env
# Provider Selection
MAIL_PROVIDER=ses                    # Options: ses, resend, log
MAIL_FALLBACK_ENABLED=true          # Enable automatic fallback
MAIL_FALLBACK_PROVIDER=resend       # Fallback provider

# Amazon SES
AWS_REGION=eu-north-1
AWS_SES_FROM_EMAIL=stock@sekuu.com
AWS_SES_FROM_NAME=Store Management
AWS_SES_SMTP_USERNAME=your_username
AWS_SES_SMTP_PASSWORD=your_password

# Resend
RESEND_API_KEY=your_api_key
RESEND_FROM_EMAIL=stock@sekuu.com
RESEND_FROM_NAME=Store Management

# General Settings
ENABLE_EMAILS=true                   # Master switch for all emails
```

## Usage

### Switching Providers

Simply change the `MAIL_PROVIDER` environment variable:

```env
# Use Amazon SES
MAIL_PROVIDER=ses

# Use Resend
MAIL_PROVIDER=resend

# Debug mode (no actual emails sent)
MAIL_PROVIDER=log
```

### Fallback Mechanism

When enabled, if the primary provider fails, the system automatically tries the fallback provider:

```env
MAIL_PROVIDER=ses
MAIL_FALLBACK_ENABLED=true
MAIL_FALLBACK_PROVIDER=resend
```

In this configuration:
1. Emails are sent via SES first
2. If SES fails, automatically retries with Resend
3. Logs indicate which provider was used

### Testing Endpoints

The system includes test endpoints for verification:

#### Get Provider Info
```bash
GET http://localhost:3000/mail/provider-info
```

Response:
```json
{
  "primaryProvider": "ses",
  "fallbackProvider": "resend",
  "fallbackEnabled": true
}
```

#### Health Check
```bash
GET http://localhost:3000/mail/health
```

Response:
```json
{
  "primary": {
    "name": "ses",
    "healthy": true
  },
  "fallback": {
    "name": "resend",
    "healthy": true
  }
}
```

#### Send Test Email
```bash
POST http://localhost:3000/mail/test
Content-Type: application/json

{
  "to": "test@example.com"
}
```

## Email Types Supported

All existing email types work with all providers:

- Welcome emails
- Password reset
- Daily/Weekly/Monthly reports
- Low stock alerts
- Invoice emails (with attachments)
- Balance alerts

## Adding a New Provider

To add a new email provider (e.g., SendGrid, Mailgun):

1. **Create Provider Class**
   ```typescript
   // src/modules/mail/providers/sendgrid-mail.provider.ts
   @Injectable()
   export class SendGridMailProvider implements MailProviderInterface {
     async sendEmail(options: EmailOptions): Promise<EmailResult> {
       // Implementation
     }
     
     getName(): string {
       return 'sendgrid';
     }
     
     async isHealthy(): Promise<boolean> {
       // Health check
     }
   }
   ```

2. **Register in Factory**
   ```typescript
   // src/modules/mail/providers/mail-provider.factory.ts
   case 'sendgrid':
     return this.sendGridProvider;
   ```

3. **Add to Module**
   ```typescript
   // src/modules/mail/mail.module.ts
   providers: [
     SendGridMailProvider,
     // ... other providers
   ]
   ```

4. **Add Configuration**
   ```env
   MAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your_key
   SENDGRID_FROM_EMAIL=your_email
   ```

## Architecture

```
MailService (public API)
    ↓
MailProviderFactory (selects provider)
    ↓
MailProviderInterface (abstraction)
    ↓
├── SesMailProvider
├── ResendMailProvider
└── LogMailProvider
```

## Logging

All email operations are logged with provider information:

```
[MailService] Email sent to user@example.com via ses
[MailService] Primary provider (ses) failed, attempting fallback to resend
[MailService] Email sent to user@example.com via fallback provider resend
```

## Troubleshooting

### Provider Not Found Error
```
Error: Unknown mail provider: xyz. Valid options: ses, resend, log
```
**Solution**: Check `MAIL_PROVIDER` value in `.env`

### Missing Configuration
```
Error: Missing required AWS SES configuration
Error: Missing required Resend API key (RESEND_API_KEY)
```
**Solution**: Ensure all required environment variables are set

### Emails Not Sending
1. Check `ENABLE_EMAILS=true`
2. Verify provider credentials
3. Check health endpoint: `GET /mail/health`
4. Review application logs

## Best Practices

1. **Use Fallback in Production**: Enable fallback for high availability
2. **Test Before Deploying**: Use test endpoint to verify configuration
3. **Monitor Logs**: Watch for fallback usage to identify provider issues
4. **Use Log Provider Locally**: Set `MAIL_PROVIDER=log` for local development
5. **Secure Credentials**: Never commit API keys to version control
