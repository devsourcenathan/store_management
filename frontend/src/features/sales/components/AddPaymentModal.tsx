import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, method: 'CASH' | 'CARD' | 'MOBILE') => void;
    remainingAmount: number;
    isProcessing: boolean;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose, onConfirm, remainingAmount, isProcessing }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState<number>(remainingAmount);
    const [method, setMethod] = useState<'CASH' | 'CARD' | 'MOBILE'>('CASH');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(amount, method);
    };

    // Reset amount when modal opens or remainingAmount changes
    React.useEffect(() => {
        if (isOpen) {
            setAmount(remainingAmount);
        }
    }, [isOpen, remainingAmount]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:text-gray-100">
                <DialogHeader>
                    <DialogTitle>{t('sales.add_payment', 'Ajouter un paiement')}</DialogTitle>
                    <DialogDescription>
                        {t('sales.remaining_balance', 'Reste à payer')}: <strong>{remainingAmount.toLocaleString()} FCFA</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('sales.amount', 'Montant')}
                        </label>
                        <input
                            type="number"
                            max={remainingAmount}
                            min={1}
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('sales.payment_method', 'Mode de paiement')}
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setMethod('CASH')}
                                className={`flex flex-col items-center p-3 border rounded-xl transition-all ${method === 'CASH'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <Banknote className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Cash</span>
                            </button>
                            {/* Card hidden as per user preference in other screens, but keeping structure if needed */}
                            <button
                                type="button"
                                onClick={() => setMethod('MOBILE')}
                                className={`flex flex-col items-center p-3 border rounded-xl transition-all ${method === 'MOBILE'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <Smartphone className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Mobile</span>
                            </button>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            {t('common.cancel', 'Annuler')}
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing || amount <= 0 || amount > remainingAmount}
                            className="px-4 py-2 btn-theme-primary rounded-lg disabled:opacity-50"
                        >
                            {isProcessing ? t('common.processing', 'Traitement...') : t('common.confirm', 'Confirmer')}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
