import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { PricingRulesEditor } from './PricingRulesEditor';

interface SubscriptionOffer {
    id?: string;
    serviceId: string;
    name: string;
    basePrice: number;
    duration: number;
    billingCycle: string;
    isActive: boolean;
    pricingRules?: any[];
}

interface OfferModalProps {
    serviceId: string;
    offer?: SubscriptionOffer | null;
    onClose: () => void;
    onSuccess: () => void;
}

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/Sheet';

export function OfferSheet({ serviceId, offer, onClose, onSuccess }: OfferModalProps) {
    const [name, setName] = useState(offer?.name || '');
    const [basePrice, setBasePrice] = useState(offer?.basePrice || 0);
    const [duration, setDuration] = useState(offer?.duration || 30);
    const [billingCycle, setBillingCycle] = useState(offer?.billingCycle || 'MONTHLY');
    const [pricingRules, setPricingRules] = useState<any[]>(offer?.pricingRules && Array.isArray(offer.pricingRules) ? offer.pricingRules : []);
    const [options, setOptions] = useState<any[]>(offer?.options || []);

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (offer?.id) {
                return api.put(`/services/${serviceId}/offers/${offer.id}`, data);
            } else {
                return api.post(`/services/${serviceId}/offers`, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription-offers', serviceId] });
            onSuccess();
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            serviceId,
            name,
            basePrice: parseFloat(basePrice as any),
            duration: parseInt(duration as any),
            billingCycle,
            isActive: true,
            pricingRules: pricingRules,
            options: options.map(opt => ({
                ...opt,
                price: typeof opt.price === 'string' ? parseFloat(opt.price) : opt.price,
                pricingRules: Array.isArray(opt.pricingRules) ? opt.pricingRules : []
            }))
        });
    };

    const addOption = () => {
        setOptions([
            ...options,
            { id: `temp-${Date.now()}`, name: '', price: 0, pricingRules: [] }
        ]);
    };

    const updateOption = (index: number, field: string, value: any) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="overflow-y-auto sm:max-w-xl">
                <SheetHeader className="mb-6">
                    <SheetTitle>{offer ? 'Edit Offer' : 'New Offer'}</SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Offer Name</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-slate-500 focus:border-slate-500"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Access (1 Mois)"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Price (FCFA)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-slate-500 focus:border-slate-500"
                                    value={basePrice}
                                    onChange={(e) => setBasePrice(e.target.value as any)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Duration (Days)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-slate-500 focus:border-slate-500"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value as any)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                            <select
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-slate-500 focus:border-slate-500"
                                value={billingCycle}
                                onChange={(e) => setBillingCycle(e.target.value)}
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="YEARLY">Yearly</option>
                                <option value="CUSTOM">Custom</option>
                            </select>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-4">Pricing Rules (Base Offer)</h4>
                            <PricingRulesEditor rules={pricingRules} onChange={setPricingRules} />
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium text-gray-900">Options</h4>
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="text-sm text-blue-600 hover:underline flex items-center"
                                >
                                    + Add Option
                                </button>
                            </div>

                            <div className="space-y-4">
                                {options.map((option, index) => (
                                    <div key={option.id || index} className="border rounded-lg p-4 bg-gray-50">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500">Option Name</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                                                    value={option.name}
                                                    onChange={(e) => updateOption(index, 'name', e.target.value)}
                                                    placeholder="e.g. Sport"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500">Price (FCFA)</label>
                                                <input
                                                    type="number"
                                                    className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                                                    value={option.price}
                                                    onChange={(e) => updateOption(index, 'price', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Pricing Rules (Option)</div>
                                            <PricingRulesEditor
                                                rules={option.pricingRules || []}
                                                onChange={(newRules) => updateOption(index, 'pricingRules', newRules)}
                                            />
                                        </div>

                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                className="text-red-500 hover:text-red-700 text-xs underline"
                                            >
                                                Remove Option
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {options.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No options added yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t mt-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {mutation.isPending ? 'Saving...' : 'Save Offer'}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
