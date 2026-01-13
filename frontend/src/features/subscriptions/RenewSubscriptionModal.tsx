import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { calculateNewEndDate } from '@/services/pricingEngine';
import { Calendar, DollarSign, CreditCard, Check } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

interface RenewSubscriptionModalProps {
    subscription: {
        id: string;
        customer: {
            name: string;
        };
        offer: {
            name: string;
            basePrice: number;
            duration: number;
            service: {
                name: string;
            };
        };
        endDate?: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export function RenewSubscriptionModal({ subscription, onClose, onSuccess }: RenewSubscriptionModalProps) {
    const [duration, setDuration] = useState(subscription.offer.duration);
    const [useBalance, setUseBalance] = useState(true);
    const [balanceAmount, setBalanceAmount] = useState(subscription.offer.basePrice);
    const [cashAmount, setCashAmount] = useState(0);

    const renewMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/subscriptions/${subscription.id}/renew`, data);
        },
        onSuccess: () => {
            onSuccess();
        },
    });

    const price = subscription.offer.basePrice; // TODO: Calculate based on duration
    const newEndDate = calculateNewEndDate(
        subscription.endDate ? new Date(subscription.endDate) : null,
        duration
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        renewMutation.mutate({
            duration,
            price,
            balanceUsed: useBalance ? balanceAmount : 0,
            clientId: `client-${Date.now()}`, // For offline sync
        });
    };

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Renew Subscription</SheetTitle>
                    <SheetDescription>
                        Extend the active subscription for {subscription.customer.name}.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Subscription Info */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Customer:</span>
                            <span className="text-gray-900 font-semibold">{subscription.customer.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Service Info:</span>
                            <span className="text-gray-900 font-semibold">{subscription.offer.service.name} / {subscription.offer.name}</span>
                        </div>
                        {subscription.endDate && (
                            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
                                <span className="text-gray-500 font-medium">Current Expiry:</span>
                                <span className="text-gray-900 font-semibold">
                                    {new Date(subscription.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Duration Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">
                            <Calendar className="w-4 h-4 inline mr-2 text-blue-600" />
                            Renewal Duration
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-lg shadow-sm px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                        >
                            <option value={30}>1 Month (30 days)</option>
                            <option value={90}>3 Months (90 days)</option>
                            <option value={180}>6 Months (180 days)</option>
                            <option value={365}>1 Year (365 days)</option>
                        </select>
                    </div>

                    {/* New End Date */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-blue-700">
                            <Calendar className="w-5 h-5 opacity-70" />
                            <span className="text-sm font-medium">New End Date</span>
                        </div>
                        <span className="text-lg font-bold text-blue-900">
                            {newEndDate.toLocaleDateString()}
                        </span>
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-900">
                            <DollarSign className="w-4 h-4 inline mr-1 text-green-600" />
                            Renewal Price
                        </label>
                        <div className="text-3xl font-black text-gray-900 tracking-tight">
                            {price.toLocaleString()} <span className="text-sm font-normal text-gray-400">FCFA</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-4 pt-2">
                        <label className="block text-sm font-semibold text-gray-900">
                            <CreditCard className="w-4 h-4 inline mr-2 text-blue-600" />
                            Payment Details
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center space-x-3 border p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors bg-white">
                                <input
                                    type="checkbox"
                                    checked={useBalance}
                                    onChange={(e) => setUseBalance(e.target.checked)}
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 text-sm">Use Prepaid Balance</div>
                                    <div className="text-xs text-gray-500 italic">Verify customer credit availability</div>
                                </div>
                            </label>

                            {useBalance && (
                                <div className="pl-8 space-y-1.5 animate-in fade-in slide-in-from-left-2">
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg shadow-sm px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Amount from balance"
                                        value={balanceAmount}
                                        onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
                                        max={price}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-gray-500 ml-1">Cash Payment</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        className="flex-1 border border-gray-300 rounded-lg shadow-sm px-4 py-2 font-bold text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Cash amount"
                                        value={cashAmount}
                                        onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Check */}
                    {(balanceAmount + cashAmount) !== price && (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-start space-x-2">
                            <Check className="w-4 h-4 text-orange-500 mt-0.5" />
                            <p className="text-xs text-orange-800 font-medium">
                                Total payment ({(balanceAmount + cashAmount).toLocaleString()} FCFA) does not cover the renewal cost.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={renewMutation.isPending || (balanceAmount + cashAmount) !== price}
                            className="flex-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm transition-all flex items-center justify-center"
                        >
                            {renewMutation.isPending ? 'Processing...' : 'Confirm Renewal'}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
