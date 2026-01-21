import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';

@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                transport: {
                    host: 'email-smtp.' + configService.get('AWS_REGION') + '.amazonaws.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: configService.get('AWS_SES_SMTP_USERNAME'),
                        pass: configService.get('AWS_SES_SMTP_PASSWORD'),
                    },
                },
                defaults: {
                    from: `"${configService.get('AWS_SES_FROM_NAME')}" <${configService.get('AWS_SES_FROM_EMAIL')}>`,
                },
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter({
                        gt: (a, b) => a > b,
                        lt: (a, b) => a < b,
                        eq: (a, b) => a === b,
                        ne: (a, b) => a !== b,
                        gte: (a, b) => a >= b,
                        lte: (a, b) => a <= b,
                    }),
                    options: {
                        strict: true,
                    },
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }
