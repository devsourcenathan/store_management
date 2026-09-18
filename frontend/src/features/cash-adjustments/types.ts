export interface CashAdjustment {
    id: string;
    storeId: string;
    expected: number;
    counted: number;
    difference: number;
    reason?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    creator?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface CreateCashAdjustmentDto {
    expected: number;
    counted: number;
    difference: number;
    reason?: string;
}
