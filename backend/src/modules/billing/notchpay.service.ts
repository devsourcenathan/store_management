import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface NotchPayPaymentInit {
    amount: number;
    currency: string;
    email: string;
    phone?: string;
    reference: string;
    description?: string;
    callback: string;
}

export interface NotchPayPaymentResponse {
    status: string;
    message: string;
    code: number;
    authorization_url?: string; // Correct location based on response
    transaction: {
        reference: string;
        amount: number;
        currency: string;
        status: string;
    };
}

export interface NotchPayVerifyResponse {
    status: string;
    message: string;
    code: number;
    transaction: {
        reference: string;
        amount: number;
        currency: string;
        status: 'pending' | 'complete' | 'failed' | 'cancelled';
        fee: number;
        converted_amount: number;
        customer: {
            email: string;
            phone?: string;
        };
    };
}

@Injectable()
export class NotchPayService {
    private readonly logger = new Logger(NotchPayService.name);
    private readonly client: AxiosInstance;
    private readonly publicKey: string;
    private readonly privateKey: string;
    private readonly mode: string;
    private readonly defaultCurrency: string;

    constructor(private configService: ConfigService) {
        this.publicKey = this.configService.get<string>('NOTCHPAY_PUBLIC_KEY') || '';
        this.privateKey = this.configService.get<string>('NOTCHPAY_PRIVATE_KEY') || '';
        this.mode = this.configService.get<string>('NOTCHPAY_MODE') || 'sandbox';
        this.defaultCurrency = this.configService.get<string>('NOTCHPAY_DEFAULT_CURRENCY') || 'XAF';

        const baseURL = this.mode === 'live'
            ? 'https://api.notchpay.co'
            : 'https://api.notchpay.co'; // Same URL, mode determined by keys

        this.client = axios.create({
            baseURL,
            headers: {
                'Authorization': this.publicKey,
                'Content-Type': 'application/json',
                // For some endpoints, X-Grant with private key might be needed
                // 'X-Grant': this.privateKey 
            },
        });
    }

    /**
     * Initialize a payment transaction
     */
    async initializePayment(data: NotchPayPaymentInit): Promise<NotchPayPaymentResponse> {
        try {
            this.logger.log(`Initializing payment: ${data.reference} for ${data.amount} ${data.currency}`);

            const response = await this.client.post('/payments/initialize', {
                amount: data.amount,
                currency: data.currency || this.defaultCurrency,
                email: data.email,
                phone: data.phone,
                reference: data.reference,
                description: data.description,
                callback: data.callback,
            });

            this.logger.log(`Payment initialized: ${response.data.transaction?.reference}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Payment initialization failed: ${error.message}`, error.response?.data);
            throw new Error(error.response?.data?.message || 'Payment initialization failed');
        }
    }

    /**
     * Verify a payment status
     */
    async verifyPayment(reference: string): Promise<NotchPayVerifyResponse> {
        try {
            this.logger.log(`Verifying payment: ${reference}`);

            const response = await this.client.get(`/payments/${reference}`);

            this.logger.log(`Payment status: ${response.data.transaction?.status}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Payment verification failed: ${error.message}`, error.response?.data);
            throw new Error(error.response?.data?.message || 'Payment verification failed');
        }
    }

    /**
     * Cancel a pending payment
     */
    async cancelPayment(reference: string): Promise<any> {
        try {
            this.logger.log(`Cancelling payment: ${reference}`);

            const response = await this.client.post(`/payments/${reference}/cancel`);

            return response.data;
        } catch (error: any) {
            this.logger.error(`Payment cancellation failed: ${error.message}`, error.response?.data);
            throw new Error(error.response?.data?.message || 'Payment cancellation failed');
        }
    }

    /**
     * Validate webhook signature
     */
    validateWebhookSignature(payload: string, signature: string): boolean {
        const webhookSecret = this.configService.get<string>('NOTCHPAY_WEBHOOK_SECRET');

        if (!webhookSecret || webhookSecret === 'your_webhook_secret_here') {
            this.logger.warn('Webhook secret not configured, skipping signature validation');
            return true; // Allow in dev mode
        }

        // NotchPay uses HMAC-SHA256 for webhook signatures
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        return signature === expectedSignature;
    }

    /**
     * Get public key for frontend
     */
    getPublicKey(): string {
        return this.publicKey;
    }
}
