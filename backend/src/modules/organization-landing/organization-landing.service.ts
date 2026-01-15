import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateOrgLandingDto } from './dto/update-org-landing.dto';
import { ImportSiteDto } from './dto/import-site.dto';
import { AuditService } from '../audit/audit.service';
import { HtmlParserService } from './services/html-parser.service';

@Injectable()
export class OrganizationLandingService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private htmlParser: HtmlParserService,
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

    /**
     * Import HTML/CSS/JS and parse into sections/blocks
     */
    async importSite(organizationId: string, dto: ImportSiteDto, userId: string) {
        const { html, css, js } = dto;

        if (!html) {
            throw new BadRequestException('HTML content is required');
        }

        // Parse HTML into sections/blocks
        const { sections, themeConfig } = this.htmlParser.parseHtml(html, css);

        // Update or create landing page with parsed content
        const result = await this.prisma.organizationLanding.upsert({
            where: { organizationId },
            update: {
                sections: sections as any,
                themeConfig: themeConfig as any,
                rawHtml: html,
                rawCss: css || null,
                rawJs: js || null,
                importedAt: new Date(),
                editMode: 'visual', // Start in visual mode after import
            },
            create: {
                organizationId,
                sections: sections as any,
                themeConfig: themeConfig as any,
                rawHtml: html,
                rawCss: css || null,
                rawJs: js || null,
                importedAt: new Date(),
                editMode: 'visual',
            },
        });

        // Audit Log
        await this.auditService.log(
            organizationId,
            userId,
            'IMPORT_SITE',
            'OrganizationLanding',
            result.id,
            { hasHtml: !!html, hasCss: !!css, hasJs: !!js },
        );

        return result;
    }

    /**
     * Export landing page as HTML/CSS/JS
     */
    async exportSite(organizationId: string) {
        const landing = await this.prisma.organizationLanding.findUnique({
            where: { organizationId },
        });

        if (!landing) {
            throw new NotFoundException('Landing page not found');
        }

        // If raw HTML exists and user is in code mode, return raw files
        if (landing.editMode === 'code' && landing.rawHtml) {
            return {
                html: landing.rawHtml,
                css: landing.rawCss || '',
                js: landing.rawJs || ''
            };
        }

        // Otherwise, generate HTML from sections/blocks
        const sections = (landing.sections as any) || [];
        const themeConfig = (landing.themeConfig as any) || {};

        return this.htmlParser.generateHtml(
            sections,
            themeConfig,
            landing.rawCss || undefined,
            landing.rawJs || undefined
        );
    }

    /**
     * Toggle edit mode between visual and code
     */
    async toggleEditMode(organizationId: string, mode: 'visual' | 'code', userId: string) {
        const landing = await this.prisma.organizationLanding.findUnique({
            where: { organizationId },
        });

        if (!landing) {
            throw new NotFoundException('Landing page not found');
        }

        // If switching to code mode, generate raw HTML from sections
        let rawHtml = landing.rawHtml;
        let rawCss = landing.rawCss;
        let rawJs = landing.rawJs;

        if (mode === 'code' && !rawHtml) {
            const exported = await this.exportSite(organizationId);
            rawHtml = exported.html;
            rawCss = exported.css || null;
            rawJs = exported.js || null;
        }

        // If switching to visual mode, parse raw HTML into sections
        let sections = landing.sections;
        let themeConfig = landing.themeConfig;

        if (mode === 'visual' && rawHtml) {
            const parsed = this.htmlParser.parseHtml(rawHtml, rawCss || undefined);
            sections = parsed.sections as any;
            themeConfig = parsed.themeConfig;
        }

        const result = await this.prisma.organizationLanding.update({
            where: { organizationId },
            data: {
                editMode: mode,
                rawHtml,
                rawCss,
                rawJs,
                sections,
                themeConfig,
            },
        });

        // Audit Log
        await this.auditService.log(
            organizationId,
            userId,
            'TOGGLE_EDIT_MODE',
            'OrganizationLanding',
            result.id,
            { mode },
        );

        return result;
    }
}
