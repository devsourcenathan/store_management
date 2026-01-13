import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Edit2, Trash2, Package, Layers, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { ServiceModal } from './ServiceModal';
import { OfferSheet } from './OfferModal';

interface Service {
    id: string;
    name: string;
    provider: string;
    description?: string;
    isActive: boolean;
}

interface SubscriptionOffer {
    id: string;
    serviceId: string;
    name: string;
    basePrice: number;
    duration: number;
    billingCycle: string;
    isActive: boolean;
}

export function OffersManagementPage() {
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
    const { data: allOffers } = useQuery<SubscriptionOffer[]>({
        queryKey: ['subscription-offers-all'],
        queryFn: async () => {
            // In a real app we might have a bulk endpoint or fetch per service.
            // For now assuming we can fetch all or iterating.
            // Let's implement a loop or a bulk endpoint if available. 
            // Fallback: fetching for the expanded service only would be better practice strictly speaking,
            // but let's assume we fetch all for the UI overview.
            // Actually, let's use the pattern of fetching when expanded or a dedicated endpoint.
            // Simplified: Fetch active offers from a general endpoint if it existed, 
            // but since our API is /services/:id/offers, let's stick to that structure.
            // We'll fetch offers only for the expanded service for now to be safe.
            return [];
        },
        enabled: false // We will manage offers via separate queries or a state component
    });

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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Offers & Services</h2>
                    <p className="text-gray-600">Configure subscription services and their pricing offers</p>
                </div>
                <button
                    onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Service
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoadingServices ? (
                    <div className="p-8 text-center text-gray-500">Loading services...</div>
                ) : services?.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Layers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No services configured</p>
                        <p className="text-sm">Create a service (e.g., "Netflix") to start adding offers.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
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
    const { data: offers, isLoading } = useQuery<SubscriptionOffer[]>({
        queryKey: ['subscription-offers', service.id],
        queryFn: async () => (await api.get(`/services/${service.id}/offers`)).data,
        enabled: isExpanded,
    });

    return (
        <div className="group">
            <div className={`p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`} onClick={(e) => {
                // Prevent toggle when clicking actions
                if ((e.target as HTMLElement).closest('button')) return;
                onToggleExpand();
            }}>
                <div className="flex items-center space-x-4">
                    {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                    <div className={`p-2 rounded-lg ${service.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Layers className="w-5 h-5" />
                    </div>
                    <div className={service.isActive ? '' : 'opacity-60'}>
                        <h3 className="text-sm font-medium text-gray-900">{service.name} {service.isActive ? '' : '(Inactive)'}</h3>
                        <p className="text-sm text-gray-500">{service.provider}</p>
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
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${service.isActive ? 'translate-x-5' : 'translate-x-0'
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
                <div className="bg-gray-50 px-4 pb-4 pl-14">
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Offers</h4>
                            <button
                                onClick={onAddOffer}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Offer
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="text-sm text-gray-500">Loading offers...</div>
                        ) : offers?.length === 0 ? (
                            <div className="text-sm text-gray-500 italic">No offers found. Add one to get started.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {offers?.map((offer: SubscriptionOffer) => (
                                    <div key={offer.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-sm">{offer.name}</div>
                                            <div className="text-xs text-gray-500">{offer.duration} days • {offer.basePrice.toLocaleString()} FCFA</div>
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
