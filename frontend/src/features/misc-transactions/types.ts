export type MiscTransactionType = 'IN' | 'OUT';

export interface MiscTransaction {
    id: string;
    storeId: string;
    date: string;
    type: MiscTransactionType;
    amount: number;
    description: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface CreateMiscTransactionDto {
    type: MiscTransactionType;
    amount: number;
    description: string;
    date?: string;
}
