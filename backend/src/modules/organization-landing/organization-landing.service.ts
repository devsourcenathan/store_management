import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateOrgLandingDto } from './dto/update-org-landing.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrganizationLandingService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async getBySubdomain(subdomain: string) {
        const landing = await this.prisma.organizationLanding.findUnique({
            where: { subdomain },
            include: { organization: { select: { name: true, logoUrl: true } } },
        });
        if (!landing || !landing.published) throw new NotFoundException('Organization not found');
        return landing;
    }

    async getByOrgId(organizationId: string) {
        // Return existing or default
        const landing = await this.prisma.organizationLanding.findUnique({
            where: { organizationId },
            include: { organization: { select: { name: true, logoUrl: true } } },
        });

        if (!landing) {
            // Return a default structure if not yet customized, or null to trigger setup
            return null;
        }
        return landing;
    }

    async upsert(organizationId: string, dto: UpdateOrgLandingDto, userId: string) {
        console.log('--- UPSERT LANDING ATTEMPT ---');
        console.log('organizationId:', organizationId);
        console.log('Incoming DTO:', JSON.stringify(dto, null, 2));

        // Check subdomain uniqueness if provided
        if (dto.subdomain) {
            const existing = await this.prisma.organizationLanding.findUnique({
                where: { subdomain: dto.subdomain },
            });
            if (existing && existing.organizationId !== organizationId) {
                throw new BadRequestException('Subdomain already taken');
            }
        }

        // Check custom domain uniqueness if provided
        if (dto.customDomain) {
            const existing = await this.prisma.organizationLanding.findUnique({
                where: { customDomain: dto.customDomain },
            });
            if (existing && existing.organizationId !== organizationId) {
                throw new BadRequestException('Custom domain already linked to another organization');
            }
        }

        let result;
        try {
            const existingLanding = await this.prisma.organizationLanding.findUnique({
                where: { organizationId },
            });

            // Only save fields that exist in the schema
            const dataToSave = {
                subdomain: dto.subdomain,
                customDomain: dto.customDomain,
                themeConfig: dto.themeConfig,
                sections: dto.sections,
                published: dto.published,
            };

            if (existingLanding) {
                // Update existing record
                result = await this.prisma.organizationLanding.update({
                    where: { organizationId },
                    data: dataToSave,
                });
            } else {
                // Create new record
                result = await this.prisma.organizationLanding.create({
                    data: {
                        organizationId,
                        ...dataToSave,
                    },
                });
            }

            console.log('Prisma upsert result:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('Prisma upsert failed:', error);
            throw error; // Re-throw to propagate the original error
        }

        // Audit Log
        await this.auditService.log(
            organizationId,
            userId,
            'UPDATE_LANDING',
            'OrganizationLanding',
            result.id,
            dto as any,
        );

        return result;
    }
}
