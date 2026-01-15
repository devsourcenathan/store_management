import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { defaultLandingTemplate } from '../organization-landing/templates/default';
import { randomBytes } from 'crypto';

// Helper to generate a URL-friendly slug
const slugify = (text: string) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                organization: true,
                stores: {
                    include: { store: true },
                },
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { passwordHash, ...result } = user;
        return result;
    }

    async login(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organizationId: user.organizationId,
                stores: user.stores,
            },
        };
    }

    async register(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        organizationName: string;
    }) {
        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Create organization and owner user in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
                data: { name: data.organizationName },
            });

            const user = await tx.user.create({
                data: {
                    email: data.email,
                    passwordHash,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    role: 'OWNER',
                    organizationId: organization.id,
                },
            });
            
            // Create a default landing page for the new organization
            const subdomain = `${slugify(data.organizationName)}-${randomBytes(4).toString('hex')}`;
            await tx.organizationLanding.create({
                data: {
                    ...defaultLandingTemplate,
                    organizationId: organization.id,
                    subdomain: subdomain,
                }
            });

            return { user, organization };
        });

        return this.login(result.user);
    }

    async getUserWithStores(userId: string) {
        // ... (omitted for brevity)
    }
}
