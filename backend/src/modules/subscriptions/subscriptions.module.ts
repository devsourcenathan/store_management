import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionRenewalService } from './subscription-renewal.service';
import { SubscriptionBalanceService } from './subscription-balance.service';
import { SubscriptionCalculationService } from './subscription-calculation.service';
import { PricingEngineService } from './pricing-engine.service';

@Module({
    controllers: [SubscriptionsController],
    providers: [
        SubscriptionsService,
        SubscriptionRenewalService,
        SubscriptionBalanceService,
        SubscriptionCalculationService,
        PricingEngineService,
    ],
    exports: [
        SubscriptionsService,
        SubscriptionRenewalService,
        SubscriptionBalanceService,
        PricingEngineService,
    ],
})
export class SubscriptionsModule { }
