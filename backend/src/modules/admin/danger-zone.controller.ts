import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DangerZoneService } from './danger-zone.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('admin/danger-zone')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DangerZoneController {
    constructor(
        private readonly dangerZoneService: DangerZoneService,
        private readonly prisma: PrismaService
    ) {}

    @Post('reset')
    @Roles(UserRole.OWNER)
    async resetModule(@Body() body: { target: string, password: string }, @Request() req: any) {
        const { target, password } = body;
        const organizationId = req.user.organizationId;
        const userId = req.user.id;

        // Validation du mot de passe de l'OWNER par sécurité
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new HttpException('Mot de passe incorrect', HttpStatus.FORBIDDEN);
        }

        const clientId = req.headers['x-client-id'] || 'SERVER';
        
        try {
            await this.dangerZoneService.resetModule(organizationId, target, clientId);
            return { success: true, message: `Module ${target} a été réinitialisé.` };
        } catch (error: any) {
            throw new HttpException(`Reset failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
