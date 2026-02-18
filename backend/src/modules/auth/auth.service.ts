import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { defaultLandingTemplate } from '../organization-landing/templates/default';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { DEFAULT_CATEGORIES } from '@/common/constants/default-categories';
import { DEFAULT_THEME_CONFIG } from '@/common/constants/default-theme';

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
        private mailService: MailService,
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
                emailNotificationsEnabled: user.emailNotificationsEnabled,
                dailyReportEnabled: user.dailyReportEnabled,
                weeklyReportEnabled: user.weeklyReportEnabled,
                monthlyReportEnabled: user.monthlyReportEnabled,
                yearlyReportEnabled: user.yearlyReportEnabled,
                separateReportsByStore: user.separateReportsByStore,
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
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Create organization and owner user in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
                data: {
                    name: data.organizationName,
                    themeConfig: DEFAULT_THEME_CONFIG,
                },
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

            // Create default categories
            await tx.category.createMany({
                data: DEFAULT_CATEGORIES.map(category => ({
                    ...category,
                    organizationId: organization.id,
                })),
            });

            return { user, organization };
        });

        return this.login(result.user);
    }

    async forgotPassword(email: string, origin?: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Return true even if user not found to prevent enumeration
            return true;
        }

        const token = randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        });

        // Determine frontend URL
        let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (origin) {
            const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
            // Also allow localhost for development testing if not explicitly restricted
            if (corsOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && origin.includes('localhost'))) {
                frontendUrl = origin;
            }
        }

        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        await this.mailService.sendPasswordResetEmail(user.email, {
            name: user.firstName,
            resetUrl,
        });

        return { message: 'Password reset email sent' };
    }

    async resetPassword(token: string, password: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid or expired token');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        return { message: 'Password successfully reset' };
    }

    async getUserWithStores(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: true,
                stores: {
                    include: { store: true },
                },
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException();
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId,
            stores: user.stores,
            organization: user.organization,
            emailNotificationsEnabled: user.emailNotificationsEnabled,
            dailyReportEnabled: user.dailyReportEnabled,
            weeklyReportEnabled: user.weeklyReportEnabled,
            monthlyReportEnabled: user.monthlyReportEnabled,
            yearlyReportEnabled: user.yearlyReportEnabled,
            separateReportsByStore: user.separateReportsByStore,
        };
    }
}
