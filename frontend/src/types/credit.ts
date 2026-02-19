export enum CreditSaleType {
    IMMEDIATE_DELIVERY = 'IMMEDIATE_DELIVERY',
    DELIVERY_AFTER_FULL_PAYMENT = 'DELIVERY_AFTER_FULL_PAYMENT',
}

export enum CreditStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
}

export interface CreditPayment {
    id: string;
    amount: number;
    method: 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT' | 'BANK_TRANSFER';
    paidAt: string;
}

export interface CreditDetails {
    saleType: CreditSaleType;
    totalAmount: number;
    initialPayment: number;
    paidAmount?: number;
    remainingAmount?: number; // Calculated on backend
    status?: CreditStatus;
    dueDate?: Date | string; // Optional due date
    creditPaymentMethod?: 'CASH' | 'CARD' | 'MOBILE'; // Allow specifying payment method for initial payment
    payments?: CreditPayment[];
}
