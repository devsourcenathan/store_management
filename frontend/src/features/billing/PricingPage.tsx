import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { billingApi, PlatformPlan } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PricingPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<PlatformPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL'>('MONTHLY');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await billingApi.getPlans();
            setPlans(data);
        } catch (error) {
            toast.error(t('billing.failedToLoadPlans', 'Failed to load plans'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: PlatformPlan) => {
        try {
            setProcessing(plan.id);
            const callbackUrl = `${window.location.origin}/billing/callback`;
            const response = await billingApi.subscribe(plan.id, billingCycle, callbackUrl);

            console.log('Subscribe Response:', response);

            if (response.type === 'trial' || response.status === 'active') {
                toast.success(t('billing.subscriptionActive', 'Subscription activated!'));
                navigate('/billing/subscription');
                setProcessing(null);
            } else if (response.paymentUrl) {
                // Redirect to NotchPay
                console.log('Redirecting to:', response.paymentUrl);
                window.location.href = response.paymentUrl;
            } else {
                console.warn('Unknown response format:', response);
                toast.error('Unexpected response from payment server');
                setProcessing(null);
            }
        } catch (error: any) {
            console.error('Subscribe Error:', error);
            toast.error(error.response?.data?.message || t('billing.subscribeFailed', 'Subscription failed'));
            setProcessing(null);
        }
    };

    const getPrice = (plan: PlatformPlan) => {
        switch (billingCycle) {
            case 'MONTHLY': return plan.monthlyPrice;
            case 'SEMI_ANNUAL': return plan.semiAnnualPrice;
            case 'ANNUAL': return plan.annualPrice;
            default: return plan.monthlyPrice;
        }
    };

    const periodLabel = () => {
        switch (billingCycle) {
            case 'MONTHLY': return '/ ' + t('billing.month', 'month');
            case 'SEMI_ANNUAL': return '/ 6 ' + t('billing.months', 'months');
            case 'ANNUAL': return '/ ' + t('billing.year', 'year');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold mb-4 text-foreground">{t('billing.pricingTitle', 'Simple, Transparent Pricing')}</h1>
                <p className="text-muted-foreground">{t('billing.pricingSubtitle', 'Choose the plan that fits your business needs')}</p>
            </div>

            <div className="flex justify-center mb-8">
                <Tabs value={billingCycle} onValueChange={(v: any) => setBillingCycle(v)} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="MONTHLY">{t('billing.monthly', 'Monthly')}</TabsTrigger>
                        <TabsTrigger value="SEMI_ANNUAL">{t('billing.semiAnnual', 'Semi-Annual (-10%)')}</TabsTrigger>
                        <TabsTrigger value="ANNUAL">{t('billing.annual', 'Annual (-20%)')}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`flex flex-col ${plan.type === 'PRO' ? 'border-primary shadow-lg scale-105' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center text-foreground">
                                {plan.name}
                                {plan.type === 'PRO' && <Badge>{t('billing.popular', 'Most Popular')}</Badge>}
                            </CardTitle>
                            <CardDescription>
                                {plan.type === 'FREE' ? 'Good for starting out' :
                                    plan.type === 'PRO' ? 'Perfect for growing businesses' : 'For large scale operations'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-foreground">{new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(Number(getPrice(plan)))}</span>
                                <span className="text-muted-foreground ml-1">{periodLabel()}</span>
                            </div>

                            <ul className="space-y-2">
                                <li className="flex items-center text-foreground">
                                    <Check className="mr-2 h-4 w-4 text-primary" />
                                    {plan.maxStores === null ? 'Unlimited' : plan.maxStores} {t('billing.stores', 'Stores')}
                                </li>
                                <li className="flex items-center text-foreground">
                                    <Check className="mr-2 h-4 w-4 text-primary" />
                                    {plan.maxProducts === null ? 'Unlimited' : plan.maxProducts} {t('billing.products', 'Products')}
                                </li>
                                <li className="flex items-center text-foreground">
                                    <Check className="mr-2 h-4 w-4 text-primary" />
                                    {plan.maxUsers === null ? 'Unlimited' : plan.maxUsers} {t('billing.users', 'Users')}
                                </li>
                                {plan.trialDays > 0 && (
                                    <li className="flex items-center text-green-600 font-medium">
                                        <Check className="mr-2 h-4 w-4" />
                                        {plan.trialDays} {t('billing.freeTrialDays', 'days free trial')}
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                variant={plan.type === 'PRO' ? 'default' : 'outline'}
                                onClick={() => handleSubscribe(plan)}
                                disabled={!!processing}
                            >
                                {processing === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {plan.type === 'FREE' ? t('billing.currentPlan', 'Current Plan') :
                                    plan.trialDays > 0 ? t('billing.startTrial', 'Start Free Trial') :
                                        t('billing.subscribe', 'Subscribe')}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
