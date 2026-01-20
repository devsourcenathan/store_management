import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { calculateSubscriptionPrice } from '@/services/pricingEngine';
import { User, Check, CreditCard, Search } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

interface Customer {
    id: string;
    name: string;
    phone?: string;
}

interface Service {
    id: string;
    name: string;
    description?: string;
}

interface SubscriptionOffer {
    id: string;
    serviceId: string;
    name: string;
    basePrice: number;
    duration: number;
    pricingRules?: any;
    options?: any[];
    isActive: boolean;
}

interface Option {
    id: string;
    name: string;
    basePrice: number;
    pricingRules?: any;
}

interface NewSubscriptionModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function NewSubscriptionModal({ onClose, onSuccess }: NewSubscriptionModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedOfferId, setSelectedOfferId] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);

    // Payment State
    const [useBalance, setUseBalance] = useState(true);
    const [balanceAmount, setBalanceAmount] = useState(0);
    const [cashAmount, setCashAmount] = useState(0);

    const queryClient = useQueryClient();

    // Queries
    const { data: customers } = useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: async () => (await api.get('/customers')).data,
    });

    const { data: services } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: async () => (await api.get('/services')).data,
    });

    const { data: offers } = useQuery<SubscriptionOffer[]>({
        queryKey: ['subscription-offers', selectedServiceId],
        queryFn: async () => {
            if (!selectedServiceId) return [];
            return (await api.get(`/services/${selectedServiceId}/offers`)).data;
        },
        enabled: !!selectedServiceId,
    });

    // Mutations
    const createCustomerMutation = useMutation({
        mutationFn: async (data: { name: string; phone?: string }) => {
            return api.post('/customers', data);
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setSelectedCustomer(response.data);
            setStep(2);
        },
    });

    const createSubscriptionMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/subscriptions', data);
        },
        onSuccess: () => {
            onSuccess();
        },
    });

    // Derived State
    const filteredCustomers = customers?.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery)
    ) || [];

    const selectedOffer = offers?.find(o => o.id === selectedOfferId);

    const options: Option[] = useMemo(() => {
        if (!selectedOffer || !selectedOffer.options) return [];
        return selectedOffer.options.map((opt: any) => ({
            id: opt.id,
            name: opt.name,
            basePrice: Number(opt.price),
            pricingRules: opt.pricingRules
        }));
    }, [selectedOffer]);

    const priceCalculation = useMemo(() => {
        if (!selectedOffer) return { offerPrice: 0, optionPrices: [], totalPrice: 0 };

        return calculateSubscriptionPrice(
            Number(selectedOffer.basePrice),
            selectedOffer.pricingRules,
            selectedOptions,
            {
                offerPrice: Number(selectedOffer.basePrice),
                offerId: selectedOffer.id,
                duration: selectedOffer.duration
            }
        );
    }, [selectedOffer, selectedOptions]);

    const handleCreateCustomer = () => {
        if (searchQuery) {
            createCustomerMutation.mutate({ name: searchQuery });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedOffer) return;

        createSubscriptionMutation.mutate({
            customerId: selectedCustomer.id,
            offerId: selectedOffer.id,
            options: selectedOptions.map(o => o.id),
            price: priceCalculation.totalPrice,
            balanceUsed: useBalance ? balanceAmount : 0,
            cashReceived: cashAmount,
            clientId: `client-${Date.now()}`
        });
    };

    useMemo(() => {
        if (useBalance) {
            setBalanceAmount(priceCalculation.totalPrice);
            setCashAmount(0);
        } else {
            setBalanceAmount(0);
            setCashAmount(priceCalculation.totalPrice);
        }
    }, [priceCalculation.totalPrice, useBalance]);

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-gray-900 dark:text-gray-100">New Subscription</SheetTitle>
                    <SheetDescription className="text-gray-500 dark:text-gray-400">
                        Complete the information below to create a new subscription.
                    </SheetDescription>
                    <div className="flex space-x-2 mt-4">
                        <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    </div>
                </SheetHeader>

                {/* Step 1: Customer Selection */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                            <User className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-500" />
                            Select Customer
                        </h4>

                        <div className="relative">
                            <input
                                type="text"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 dark:bg-gray-700 dark:text-white"
                                placeholder="Search by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                    <div
                                        key={customer.id}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 flex justify-between items-center ${selectedCustomer?.id === customer.id ? 'bg-theme-primary/10 border-l-4 border-theme-primary' : ''}`}
                                        onClick={() => setSelectedCustomer(customer)}
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone || 'No phone'}</div>
                                        </div>
                                        {selectedCustomer?.id === customer.id && <Check className="w-5 h-5 text-blue-600 dark:text-blue-500" />}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    No customers found.
                                    {searchQuery && (
                                        <button
                                            onClick={handleCreateCustomer}
                                            className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                                            disabled={createCustomerMutation.isPending}
                                        >
                                            Create "{searchQuery}"
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!selectedCustomer}
                                className="px-6 py-2 btn-theme-primary rounded-lg disabled:opacity-50 font-medium"
                            >
                                Next: Select Offer
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Offer Selection */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service</label>
                            <div className="grid grid-cols-2 gap-3">
                                {services?.map(service => (
                                    <div
                                        key={service.id}
                                        className={`border rounded-lg p-3 cursor-pointer hover:border-theme-primary/50 transition-all ${selectedServiceId === service.id ? 'ring-2 ring-theme-primary border-transparent bg-theme-primary/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                                        onClick={() => {
                                            setSelectedServiceId(service.id);
                                            setSelectedOfferId('');
                                            setSelectedOptions([]);
                                        }}
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{service.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedServiceId && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offer</label>
                                {offers && offers.length > 0 ? (
                                    <div className="space-y-2">
                                        {offers.map(offer => (
                                            <div
                                                key={offer.id}
                                                className={`border rounded-lg p-3 cursor-pointer hover:border-theme-primary/50 flex justify-between items-center transition-all ${selectedOfferId === offer.id ? 'bg-theme-primary/10 border-theme-primary ring-1 ring-theme-primary' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                                                onClick={() => setSelectedOfferId(offer.id)}
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{offer.name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{offer.duration} days</div>
                                                </div>
                                                <div className="font-bold text-blue-600 dark:text-blue-400">{offer.basePrice.toLocaleString()} FCFA</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic text-sm">No offers available for this service.</div>
                                )}
                            </div>
                        )}

                        {selectedOfferId && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {options.map(option => (
                                        <div
                                            key={option.id}
                                            className={`border rounded-lg p-3 cursor-pointer hover:border-theme-primary/50 text-center transition-all ${selectedOptions.find(o => o.id === option.id) ? 'bg-theme-primary/10 border-theme-primary ring-1 ring-theme-primary' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                                            onClick={() => {
                                                if (selectedOptions.find(o => o.id === option.id)) {
                                                    setSelectedOptions(selectedOptions.filter(o => o.id !== option.id));
                                                } else {
                                                    setSelectedOptions([...selectedOptions, option]);
                                                }
                                            }}
                                        >
                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{option.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">+{option.basePrice.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-4 gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedOfferId}
                                className="flex-1 px-4 py-2 btn-theme-primary rounded-lg disabled:opacity-50 font-medium"
                            >
                                Next: Payment
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Payment */}
                {step === 3 && selectedCustomer && selectedOffer && (
                    <div className="space-y-6">
                        <div className="bg-theme-primary/10 p-4 rounded-lg space-y-3 border border-theme-primary/20">
                            <h4 className="font-bold text-blue-900 dark:text-blue-100 border-b border-blue-200 dark:border-blue-700 pb-2 flex justify-between items-center">
                                <span>Order Summary</span>
                                <span className="text-xs font-normal text-theme-primary bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-theme-primary/30 uppercase tracking-wider">Ready to Pay</span>
                            </h4>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700 dark:text-blue-300">Customer:</span>
                                    <span className="font-medium text-blue-900 dark:text-blue-100">{selectedCustomer.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700 dark:text-blue-300">Plan:</span>
                                    <span className="font-medium text-blue-900 dark:text-blue-100">{selectedOffer.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700 dark:text-blue-300">Base Price:</span>
                                    <span className="text-blue-900 dark:text-blue-100">{priceCalculation.offerPrice.toLocaleString()} FCFA</span>
                                </div>
                                {selectedOptions.length > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-blue-700 dark:text-blue-300">Options:</span>
                                        <span className="text-blue-900 dark:text-blue-100">+{(priceCalculation.totalPrice - priceCalculation.offerPrice).toLocaleString()} FCFA</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between text-xl font-bold border-t border-blue-200 dark:border-blue-700 pt-2 mt-2 text-blue-900 dark:text-blue-100">
                                <span>Total:</span>
                                <span>{priceCalculation.totalPrice.toLocaleString()} FCFA</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                                <CreditCard className="w-4 h-4 inline mr-2 text-blue-600 dark:text-blue-400" />
                                Payment Method
                            </label>

                            <div className="space-y-3">
                                <label className="flex items-center space-x-3 border dark:border-gray-600 p-4 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-white dark:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={useBalance}
                                        onChange={(e) => setUseBalance(e.target.checked)}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500 dark:bg-gray-700"
                                    />
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">Charge to Balance</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Deduct from customer's prepaid credit</div>
                                    </div>
                                </label>

                                {useBalance && (
                                    <div className="pl-8 space-y-1.5 animate-in fade-in slide-in-from-left-2">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Amount to deduct</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm pl-4 pr-12 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                value={balanceAmount}
                                                onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
                                                max={priceCalculation.totalPrice}
                                            />
                                            <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">FCFA</span>
                                        </div>
                                    </div>
                                )}

                                {/* <div className="space-y-1.5 pt-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cash Payment</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm pl-4 pr-12 py-3 text-lg font-bold focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            value={cashAmount}
                                            onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-4 text-sm text-gray-400 font-bold uppercase">FCFA</span>
                                    </div>
                                </div> */}

                                {(balanceAmount + cashAmount) !== priceCalculation.totalPrice && (
                                    <div className="flex items-center text-orange-700 text-xs bg-orange-50 p-3 rounded-lg border border-orange-100 italic animate-pulse">
                                        <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                                        Warning: Total paid ({(balanceAmount + cashAmount).toLocaleString()}) does not match the required amount ({priceCalculation.totalPrice.toLocaleString()}).
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createSubscriptionMutation.isPending}
                                className="flex-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold shadow-sm flex items-center justify-center transition-all"
                            >
                                {createSubscriptionMutation.isPending ? 'Syncing...' : (
                                    <>
                                        <Check className="w-5 h-5 mr-2" />
                                        Confirm & Finalize
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
