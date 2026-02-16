import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { APP_FILTER } from '@nestjs/core';
// import { SentryGlobalFilter } from '@sentry/nestjs'; // Removed due to import issues
import { SentryFilter } from './common/filters/sentry.filter';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { SalesModule } from './modules/sales/sales.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { SuppliesModule } from './modules/supplies/supplies.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ServicesModule } from './modules/services/services.module';
import { MediaModule } from './modules/media/media.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { LandingModule } from './modules/landing/landing.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrganizationLandingModule } from './modules/organization-landing/organization-landing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthController } from './health/health.controller';
import { MailModule } from './modules/mail/mail.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { BillingModule } from './modules/billing/billing.module';
import { DevicesModule } from './modules/devices/devices.module';
import { MaintenancesModule } from './modules/maintenances/maintenances.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        I18nModule.forRoot({
            fallbackLanguage: 'fr',
            loaderOptions: {
                path: path.join(__dirname, '/i18n/'),
                watch: true,
            },
            resolvers: [
                { use: QueryResolver, options: ['lang'] },
                AcceptLanguageResolver,
            ],
        }),
        PrismaModule,
        AuthModule,
        OrganizationsModule,
        UsersModule,
        StoresModule,
        ProductsModule,
        StockModule,
        SalesModule,
        CustomersModule,
        SuppliersModule,
        SuppliesModule,
        SubscriptionsModule,
        ServicesModule,
        MediaModule,
        SyncModule,
        AuditModule,
        AnalyticsModule,
        LandingModule,
        AdminModule,
        OrganizationLandingModule,
        MailModule,
        ReportsModule,
        SchedulerModule,
        BillingModule,
        DevicesModule,
        MaintenancesModule,
        PermissionsModule,
    ],
    controllers: [HealthController],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryFilter,
        },
    ],
})
export class AppModule { }
