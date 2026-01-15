import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ServicesService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        const services = await this.prisma.service.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { offers: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return Promise.all(services.map(async (service) => {
            const media = await this.prisma.media.findMany({
                where: {
                    organizationId,
                    entityType: 'SERVICE',
                    entityId: service.id
                }
            });
            return { ...service, media };
        }));
    }

    async findOne(id: string) {
        const service = await this.prisma.service.findUnique({
            where: { id }
        });
        if (!service) throw new NotFoundException('Service not found');

        const media = await this.prisma.media.findMany({
            where: {
                organizationId: service.organizationId,
                entityType: 'SERVICE',
                entityId: service.id
            }
        });

        return { ...service, media };
    }

    async create(data: any, organizationId: string) {
        // Create service and default account
        return this.prisma.$transaction(async (tx) => {
            const service = await tx.service.create({
                data: {
                    ...data,
                    organizationId
                }
            });

            // Create default subscription account for this service/store? 
            // Actually, accounts are per store. We might lazily create them or create for all stores here.
            // For now, let's keep it simple and just create the service.
            // Accounts are usually created when needed or we can create one for the main store if known.

            return service;
        });
    }

    async update(id: string, data: any) {
        // Filter out fields that shouldn't be updated or cause issues
        const { name, description, provider, isActive } = data;

        return this.prisma.service.update({
            where: { id },
            data: {
                name,
                description,
                provider,
                isActive
            }
        });
    }

    async remove(id: string) {
        // Check for dependencies
        const offerCount = await this.prisma.subscriptionOffer.count({
            where: { serviceId: id }
        });

        if (offerCount > 0) {
            // Check if any of these offers have active subscriptions
            // This is a deeper check but safer. For now, valid offers implies potential usage.
            // A better check is to see if any CustomerSubscription links to offers of this service.
            const subscriptionCount = await this.prisma.customerSubscription.count({
                where: {
                    offer: { serviceId: id }
                }
            });

            if (subscriptionCount > 0) {
                throw new BadRequestException(
                    'Cannot delete service with existing subscriptions. Please deactivate it instead.'
                );
            }
        }

        return this.prisma.service.delete({
            where: { id }
        });
    }

    // Offers
    async findOffers(serviceId: string) {
        const offers = await this.prisma.subscriptionOffer.findMany({
            where: { serviceId },
            include: {
                options: true,
                service: true // Include service to get orgId if needed, though we can infer it or fetch separately
            },
            orderBy: { basePrice: 'asc' }
        });

        if (offers.length === 0) return [];

        const organizationId = offers[0].service.organizationId;

        return Promise.all(offers.map(async (offer) => {
            const media = await this.prisma.media.findMany({
                where: {
                    organizationId, // We assume all offers belong to same org as service
                    entityType: 'OFFER',
                    entityId: offer.id
                }
            });
            return { ...offer, media };
        }));
    }

    async createOffer(serviceId: string, data: any) {
        const { options, ...offerData } = data;

        return this.prisma.subscriptionOffer.create({
            data: {
                ...offerData,
                serviceId,
                options: options && Array.isArray(options) ? {
                    create: options.map((opt: any) => ({
                        ...opt,
                        price: Number(opt.price) // Ensure price is number
                    }))
                } : undefined
            }
        });
    }

    async updateOffer(offerId: string, data: any) {
        const { options, ...offerData } = data;

        // Transaction to update offer and sync options
        return this.prisma.$transaction(async (tx) => {
            // 1. Update basic offer data
            const updatedOffer = await tx.subscriptionOffer.update({
                where: { id: offerId },
                data: offerData
            });

            // 2. Sync options if provided
            if (options && Array.isArray(options)) {
                // Keep IDs that are not temporary
                const keepIds = options
                    .filter((o: any) => o.id && !o.id.toString().startsWith('temp-'))
                    .map((o: any) => o.id);

                // Delete removed options
                await tx.subscriptionOption.deleteMany({
                    where: {
                        offerId,
                        id: { notIn: keepIds }
                    }
                });

                // Upsert (Update existing or Create new)
                for (const opt of options) {
                    const price = Number(opt.price);

                    if (opt.id && !opt.id.toString().startsWith('temp-')) {
                        // Update existing
                        await tx.subscriptionOption.update({
                            where: { id: opt.id },
                            data: {
                                name: opt.name,
                                price: price,
                                pricingRules: opt.pricingRules
                            }
                        });
                    } else {
                        // Create new
                        await tx.subscriptionOption.create({
                            data: {
                                offerId,
                                name: opt.name,
                                price: price,
                                pricingRules: opt.pricingRules
                            }
                        });
                    }
                }
            }

            return updatedOffer;
        });
    }

    // Options
    async findOptions(offerId: string) {
        return this.prisma.subscriptionOption.findMany({
            where: { offerId },
            orderBy: { price: 'asc' }
        });
    }

    async createOption(offerId: string, data: any) {
        return this.prisma.subscriptionOption.create({
            data: {
                ...data,
                offerId
            }
        });
    }

    async updateOption(optionId: string, data: any) {
        return this.prisma.subscriptionOption.update({
            where: { id: optionId },
            data
        });
    }

    async removeOption(optionId: string) {
        return this.prisma.subscriptionOption.delete({
            where: { id: optionId }
        });
    }
}
