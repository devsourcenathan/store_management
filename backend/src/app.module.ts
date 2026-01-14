import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
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
import { ImagesModule } from './modules/images/images.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { LandingModule } from './modules/landing/landing.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrganizationLandingModule } from './modules/organization-landing/organization-landing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

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
        ImagesModule,
        SyncModule,
        AuditModule,
        AnalyticsModule,
        LandingModule,
        AdminModule,
        OrganizationLandingModule,
    ],
})
export class AppModule { }
