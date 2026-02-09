import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billingApi } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingCallbackPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const reference = searchParams.get('reference');

    useEffect(() => {
        if (reference) {
            verifyPayment(reference);
        } else {
            navigate('/billing/pricing');
        }
    }, [reference]);

    const verifyPayment = async (ref: string) => {
        try {
            const response = await billingApi.handleCallback(ref);
            if (response.success) {
                toast.success(t('billing.paymentSuccess', 'Payment successful! Subscription active.'));
                navigate('/billing/subscription');
            } else {
                toast.error(t('billing.paymentPending', 'Payment verification failed or pending.'));
                navigate('/billing/subscription');
            }
        } catch (error) {
            toast.error(t('billing.paymentError', 'Error verifying payment.'));
            navigate('/billing/subscription');
        }
    };

    return (
        <div className="flex flex-col justify-center items-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
            <h2 className="text-xl font-semibold">{t('billing.verifying', 'Verifying payment...')}</h2>
        </div>
    );
}
