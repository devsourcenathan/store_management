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
        if (!landing) throw new NotFoundException('Organization not found');
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

        const result = await this.prisma.organizationLanding.upsert({
            where: { organizationId },
            update: { ...dto },
            create: {
                organizationId,
                ...dto,
            },
        });

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
