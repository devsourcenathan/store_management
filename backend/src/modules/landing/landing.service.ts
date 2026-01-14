import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateLandingContentDto } from './dto/update-landing-content.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class LandingService {
    constructor(private prisma: PrismaService) { }

    async getLandingContent() {
        // Return only the most recent content or a specific active one
        // For append-only, we might want to get the latest
        const content = await this.prisma.landingContent.findFirst({
            orderBy: { createdAt: 'desc' },
        });
        return content || {
            heroTitle: 'Welcome to Our Platform',
            heroSubtitle: 'The best solution for your business',
            ctaText: 'Get Started',
            sections: [],
        };
    }

    async updateLandingContent(userId: string, dto: UpdateLandingContentDto) {
        // Only GLOBAL_ADMIN should call this (check in controller or via guard)
        // Append-only: create new record
        return this.prisma.landingContent.create({
            data: {
                ...dto,
            },
        });
    }

    async registerOrganization(dto: CreateOrganizationDto) {
        const { email, password, orgName, ownerFirstName, ownerLastName, storeName } = dto;

        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Transaction to create Org, User, and default Store
        return this.prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    email: email, // Optional: org email same as owner for now
                },
            });

            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName: ownerFirstName,
                    lastName: ownerLastName,
                    role: UserRole.OWNER,
                    organizationId: org.id,
                },
            });

            const store = await tx.store.create({
                data: {
                    name: storeName,
                    organizationId: org.id,
                },
            });

            // Link user to store
            await tx.userStore.create({
                data: {
                    userId: user.id,
                    storeId: store.id,
                },
            });

            // Create default synced org landing? (optional)

            return {
                message: 'Organization created successfully',
                organizationId: org.id,
                userId: user.id,
            };
        });
    }
}
