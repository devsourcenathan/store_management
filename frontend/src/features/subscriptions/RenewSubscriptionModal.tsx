import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { calculateNewEndDate } from '@/services/pricingEngine';
import { X, Calendar, DollarSign, CreditCard } from 'lucide-react';

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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Renew Subscription</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Subscription Info */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Customer:</span>
                            <span className="text-sm font-medium">{subscription.customer.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Service:</span>
                            <span className="text-sm font-medium">{subscription.offer.service.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Offer:</span>
                            <span className="text-sm font-medium">{subscription.offer.name}</span>
                        </div>
                        {subscription.endDate && (
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Current End Date:</span>
                                <span className="text-sm font-medium">
                                    {new Date(subscription.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Duration Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Renewal Duration
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700">New End Date:</span>
                            <span className="text-sm font-bold text-blue-900">
                                {newEndDate.toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            Price
                        </label>
                        <div className="text-2xl font-bold text-gray-900">{price.toLocaleString()} FCFA</div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <CreditCard className="w-4 h-4 inline mr-1" />
                            Payment Method
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={useBalance}
                                    onChange={(e) => setUseBalance(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm">Use Balance Account</span>
                            </label>
                            {useBalance && (
                                <input
                                    type="number"
                                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    placeholder="Amount from balance"
                                    value={balanceAmount}
                                    onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
                                    max={price}
                                />
                            )}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">Cash Payment:</span>
                                <input
                                    type="number"
                                    className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                                    placeholder="Cash amount"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total Check */}
                    {(balanceAmount + cashAmount) !== price && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Payment total ({(balanceAmount + cashAmount).toLocaleString()} FCFA) doesn't match price ({price.toLocaleString()} FCFA)
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={renewMutation.isPending || (balanceAmount + cashAmount) !== price}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {renewMutation.isPending ? 'Processing...' : 'Renew Subscription'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
