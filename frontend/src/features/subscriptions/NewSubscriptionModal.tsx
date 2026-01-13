import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { calculateSubscriptionPrice } from '@/services/pricingEngine';
import { X, User, Check, CreditCard, Search } from 'lucide-react';

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

    // Options are now derived from the selected offer
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
        // Simple quick create logic - could be expanded to a modal
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

    // Auto-fill balance amount when price changes or useBalance toggled
    useMemo(() => {
        if (useBalance) {
            // In a real app we'd check available balance here
            setBalanceAmount(priceCalculation.totalPrice);
            setCashAmount(0);
        } else {
            setBalanceAmount(0);
            setCashAmount(priceCalculation.totalPrice);
        }
    }, [priceCalculation.totalPrice, useBalance]);


    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold">New Subscription</h3>
                        <div className="flex space-x-2 mt-2">
                            <div className={`h-2 w-8 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            <div className={`h-2 w-8 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            <div className={`h-2 w-8 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Step 1: Customer Selection */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center">
                            <User className="w-5 h-5 mr-2 text-gray-500" />
                            Select Customer
                        </h4>

                        <div className="relative">
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2"
                                placeholder="Search by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                    <div
                                        key={customer.id}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedCustomer?.id === customer.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                        onClick={() => setSelectedCustomer(customer)}
                                    >
                                        <div>
                                            <div className="font-medium">{customer.name}</div>
                                            <div className="text-sm text-gray-500">{customer.phone || 'No phone'}</div>
                                        </div>
                                        {selectedCustomer?.id === customer.id && <Check className="w-5 h-5 text-blue-600" />}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-500">
                                    No customers found.
                                    {searchQuery && (
                                        <button
                                            onClick={handleCreateCustomer}
                                            className="ml-2 text-blue-600 hover:underline"
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
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                            <div className="grid grid-cols-2 gap-3">
                                {services?.map(service => (
                                    <div
                                        key={service.id}
                                        className={`border rounded-lg p-3 cursor-pointer hover:border-blue-400 ${selectedServiceId === service.id ? 'ring-2 ring-blue-600 border-transparent' : ''}`}
                                        onClick={() => {
                                            setSelectedServiceId(service.id);
                                            setSelectedOfferId('');
                                            setSelectedOptions([]);
                                        }}
                                    >
                                        <div className="font-medium text-gray-900">{service.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedServiceId && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Offer</label>
                                {offers && offers.length > 0 ? (
                                    <div className="space-y-2">
                                        {offers.map(offer => (
                                            <div
                                                key={offer.id}
                                                className={`border rounded-lg p-3 cursor-pointer hover:border-blue-400 flex justify-between items-center ${selectedOfferId === offer.id ? 'bg-blue-50 border-blue-600' : ''}`}
                                                onClick={() => setSelectedOfferId(offer.id)}
                                            >
                                                <div>
                                                    <div className="font-medium text-gray-900">{offer.name}</div>
                                                    <div className="text-sm text-gray-500">{offer.duration} days</div>
                                                </div>
                                                <div className="font-bold text-gray-900">{offer.basePrice.toLocaleString()} FCFA</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic">No offers available for this service.</div>
                                )}
                            </div>
                        )}

                        {selectedOfferId && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {options.map(option => (
                                        <div
                                            key={option.id}
                                            className={`border rounded-lg p-3 cursor-pointer hover:border-blue-400 text-center ${selectedOptions.find(o => o.id === option.id) ? 'bg-blue-50 border-blue-600' : ''}`}
                                            onClick={() => {
                                                if (selectedOptions.find(o => o.id === option.id)) {
                                                    setSelectedOptions(selectedOptions.filter(o => o.id !== option.id));
                                                } else {
                                                    setSelectedOptions([...selectedOptions, option]);
                                                }
                                            }}
                                        >
                                            <div className="font-medium">{option.name}</div>
                                            <div className="text-xs text-gray-500">+{option.basePrice.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedOfferId}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Next: Payment
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Payment */}
                {step === 3 && selectedCustomer && selectedOffer && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <h4 className="font-bold text-gray-900 border-b pb-2 mb-2">Summary</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Customer:</span>
                                <span className="font-medium">{selectedCustomer.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Service:</span>
                                <span className="font-medium">{selectedOffer.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Base Price:</span>
                                <span>{priceCalculation.offerPrice.toLocaleString()} FCFA</span>
                            </div>
                            {selectedOptions.length > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Options ({selectedOptions.map(o => o.name).join(', ')}):</span>
                                    <span>+{(priceCalculation.totalPrice - priceCalculation.offerPrice).toLocaleString()} FCFA</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                <span>Total:</span>
                                <span>{priceCalculation.totalPrice.toLocaleString()} FCFA</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CreditCard className="w-4 h-4 inline mr-1" />
                                Payment Method
                            </label>

                            <div className="space-y-3">
                                <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={useBalance}
                                        onChange={(e) => setUseBalance(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium">Use Balance Account</div>
                                        <div className="text-sm text-gray-500">Service account will be verified on validation</div>
                                    </div>
                                </label>

                                {useBalance && (
                                    <div className="pl-6">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Amount from balance</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                                            value={balanceAmount}
                                            onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
                                            max={priceCalculation.totalPrice}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Payment</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        value={cashAmount}
                                        onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="Enter cash amount..."
                                    />
                                </div>

                                {(balanceAmount + cashAmount) !== priceCalculation.totalPrice && (
                                    <div className="flex items-center text-yellow-700 text-sm bg-yellow-50 p-2 rounded">
                                        <Check className="w-4 h-4 mr-1" />
                                        Reminder: Full payment usually required ({priceCalculation.totalPrice.toLocaleString()} FCFA)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                onClick={() => setStep(2)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createSubscriptionMutation.isPending}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                            >
                                {createSubscriptionMutation.isPending ? 'Processing...' : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Create Subscription
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
