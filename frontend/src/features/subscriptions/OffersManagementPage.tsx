import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Edit2, Trash2, Layers, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { ServiceModal } from './ServiceModal';
import { OfferSheet } from './OfferModal';
import { Media } from '@/services/mediaService';

interface Service {
    id: string;
    name: string;
    provider: string;
    description?: string;
    isActive: boolean;
    media?: Media[];
}

interface SubscriptionOffer {
    id: string;
    serviceId: string;
    name: string;
    basePrice: number;
    duration: number;
    billingCycle: string;
    isActive: boolean;
    media?: Media[];
}

export function OffersManagementPage() {
    const { t } = useTranslation();
    const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [editingOffer, setEditingOffer] = useState<SubscriptionOffer | null>(null);

    // For Offer Modal context
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    // Queries
    const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
        queryKey: ['services'],
        queryFn: async () => (await api.get('/services')).data,
    });

    // Fetch offers for all services (or could fetch on expand per service to optimize)


    // Mutations
    const deleteServiceMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/services/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    });

    const toggleServiceStatusMutation = useMutation({
        mutationFn: async (service: Service) => api.put(`/services/${service.id}`, { ...service, isActive: !service.isActive }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('offers.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('offers.subtitle')}</p>
                </div>
                <button
                    onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}
                    className="w-full sm:w-auto px-4 py-2 btn-theme-primary rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('offers.new_service')}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                {isLoadingServices ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                ) : services?.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <Layers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium">{t('offers.no_services')}</p>
                        <p className="text-sm">Create a service to start adding offers.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {services?.map(service => (
                            <ServiceRow
                                key={service.id}
                                service={service}
                                isExpanded={expandedServiceId === service.id}
                                onToggleExpand={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                                onEdit={() => { setEditingService(service); setIsServiceModalOpen(true); }}
                                onDelete={() => { if (confirm('Delete this service?')) deleteServiceMutation.mutate(service.id); }}
                                onAddOffer={() => { setSelectedServiceId(service.id); setEditingOffer(null); setIsOfferModalOpen(true); }}
                                onEditOffer={(offer: SubscriptionOffer) => { setSelectedServiceId(service.id); setEditingOffer(offer); setIsOfferModalOpen(true); }}
                                onToggleStatus={() => toggleServiceStatusMutation.mutate(service)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Service Modal */}
            {isServiceModalOpen && (
                <ServiceModal
                    service={editingService}
                    onClose={() => setIsServiceModalOpen(false)}
                    onSuccess={() => setIsServiceModalOpen(false)}
                />
            )}

            {/* Offer Sheet */}
            {isOfferModalOpen && selectedServiceId && (
                <OfferSheet
                    serviceId={selectedServiceId}
                    offer={editingOffer}
                    onClose={() => setIsOfferModalOpen(false)}
                    onSuccess={() => setIsOfferModalOpen(false)}
                />
            )}
        </div>
    );
}

// Helper component for the row to handle its own offers query
function ServiceRow({ service, isExpanded, onToggleExpand, onEdit, onDelete, onAddOffer, onEditOffer, onToggleStatus }: any) {
    const { t } = useTranslation();
    const { data: offers, isLoading } = useQuery<SubscriptionOffer[]>({
        queryKey: ['subscription-offers', service.id],
        queryFn: async () => (await api.get(`/services/${service.id}/offers`)).data,
        enabled: isExpanded,
    });

    return (
        <div className="group">
            <div className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${isExpanded ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`} onClick={(e) => {
                // Prevent toggle when clicking actions
                if ((e.target as HTMLElement).closest('button')) return;
                onToggleExpand();
            }}>
                <div className="flex items-center space-x-4">
                    {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${service.isActive ? 'bg-theme-primary/10 text-theme-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {service.media && service.media.length > 0 ? (
                            <img src={service.media[0].url} alt={service.name} className="w-full h-full object-cover" />
                        ) : (
                            <Layers className="w-5 h-5" />
                        )}
                    </div>
                    <div className={service.isActive ? '' : 'opacity-60'}>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{service.name} {service.isActive ? '' : `(${t('common.inactive', 'Inactive')})`}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{service.provider}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Status Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus();
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${service.isActive ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                        title={service.isActive ? 'Deactivate Service' : 'Activate Service'}
                    >
                        <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-200 shadow ring-0 transition duration-200 ease-in-out ${service.isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>

                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Expanded Content: Offers List */}
            {isExpanded && (
                <div className="bg-gray-50 dark:bg-gray-900/30 px-4 pb-4 pl-14">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('offers.available_offers')}</h4>
                            <button
                                onClick={onAddOffer}
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                            >
                                <Plus className="w-3 h-3 mr-1" /> {t('offers.add_offer')}
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="text-sm text-gray-500">{t('common.loading')}</div>
                        ) : offers?.length === 0 ? (
                            <div className="text-sm text-gray-500 italic">No offers found. Add one to get started.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {offers?.map((offer: SubscriptionOffer) => (
                                    <div key={offer.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {offer.media && offer.media.length > 0 ? (
                                                    <img src={offer.media[0].url} alt={offer.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-xs font-bold text-gray-400">OFFER</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{offer.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{offer.duration} days • {offer.basePrice.toLocaleString()} FCFA</div>
                                            </div>
                                        </div>
                                        <div className="text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => onEditOffer(offer)}>
                                            <Settings className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
