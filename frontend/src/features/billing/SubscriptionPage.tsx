import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { billingApi, OrganizationSubscription, BillingInvoice } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CreditCard, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
    const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const sub = await billingApi.getSubscription();
            if (!sub) {
                navigate('/billing/pricing');
                return;
            }
            setSubscription(sub);

            // Invoices are included in subscription usually, but let's fetch if needed or use what we have
            const invs = await billingApi.getInvoices();
            setInvoices(invs);
        } catch (error) {
            toast.error(t('billing.loadFailed', 'Failed to load subscription details'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    if (!subscription) return null;

    const statusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'default'; // primary
            case 'LIFETIME': return 'secondary';
            case 'TRIALING': return 'outline';
            case 'PAST_DUE': return 'destructive';
            default: return 'secondary';
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <h1 className="text-3xl font-bold text-foreground">{t('billing.mySubscription', 'My Subscription')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Plan Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-foreground">{subscription.plan.name}</CardTitle>
                                <CardDescription>{t('billing.currentPlan', 'Current Plan')}</CardDescription>
                            </div>
                            <Badge variant={statusColor(subscription.status) as any}>{subscription.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('billing.billingCycle', 'Billing Cycle')}</p>
                                <p className="text-foreground">{subscription.isLifetime ? 'Lifetime' : subscription.billingCycle}</p>
                            </div>
                            {!subscription.isLifetime && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {subscription.status === 'TRIALING' ? t('billing.trialEnds', 'Trial Ends') : t('billing.nextPayment', 'Next Payment')}
                                    </p>
                                    <p className="font-bold flex items-center text-foreground">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {subscription.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), 'PP') : '-'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {subscription.status === 'PAST_DUE' && (
                            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                {t('billing.pastDueWarning', 'Your payment is past due. Please update your payment method.')}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => navigate('/billing/pricing')} variant="outline">
                            {t('billing.changePlan', 'Change Plan')}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Usage/Limits Card (Optional - can be expanded) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">{t('billing.limits', 'Plan Limits')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-foreground">
                        <div className="flex justify-between">
                            <span>{t('billing.stores', 'Stores')}</span>
                            <span className="font-bold">{subscription.plan.maxStores === null ? 'Unlimited' : subscription.plan.maxStores}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('billing.products', 'Products')}</span>
                            <span className="font-bold">{subscription.plan.maxProducts === null ? 'Unlimited' : subscription.plan.maxProducts}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('billing.users', 'Users')}</span>
                            <span className="font-bold">{subscription.plan.maxUsers === null ? 'Unlimited' : subscription.plan.maxUsers}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">{t('billing.billingHistory', 'Billing History')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('billing.date', 'Date')}</TableHead>
                                <TableHead>{t('billing.amount', 'Amount')}</TableHead>
                                <TableHead>{t('billing.status', 'Status')}</TableHead>
                                <TableHead>{t('billing.invoice', 'Invoice')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell>{format(new Date(invoice.createdAt), 'PP')}</TableCell>
                                    <TableCell>{new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(Number(invoice.amount))}</TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.status === 'PAID' ? 'secondary' : 'outline'}>{invoice.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {invoice.status === 'PENDING' && invoice.paymentUrl ? (
                                            <Button size="sm" onClick={() => window.location.href = invoice.paymentUrl!}>
                                                {t('billing.payNow', 'Pay Now')}
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">{invoice.invoiceNumber}</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
