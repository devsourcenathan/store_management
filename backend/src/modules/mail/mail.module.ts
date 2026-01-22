import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { TemplateRendererService } from './services/template-renderer.service';
import { SesMailProvider } from './providers/ses-mail.provider';
import { ResendMailProvider } from './providers/resend-mail.provider';
import { LogMailProvider } from './providers/log-mail.provider';
import { MailProviderFactory } from './providers/mail-provider.factory';

@Module({
    imports: [ConfigModule],
    controllers: [MailController],
    providers: [
        TemplateRendererService,
        SesMailProvider,
        ResendMailProvider,
        LogMailProvider,
        MailProviderFactory,
        MailService,
    ],
    exports: [MailService],
})
export class MailModule { }
