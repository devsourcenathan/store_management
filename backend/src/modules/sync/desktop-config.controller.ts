import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DesktopSyncService } from './desktop-sync.service';
import axios from 'axios';

@Controller('desktop-config')
export class DesktopConfigController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly desktopSync: DesktopSyncService
    ) { }

    @Get('status')
    async getStatus() {
        try {
            const config = await this.prisma.desktopConfig.findFirst();
            return { isConfigured: !!(config?.remoteUrl && config?.syncToken) };
        } catch {
            return { isConfigured: false };
        }
    }

    @Get('sync-status')
    async getSyncStatus() {
        return this.desktopSync.getSyncStatus();
    }

    @Get()
    async getConfig() {
        const config = await this.prisma.desktopConfig.findFirst();
        return config || {};
    }

    @Post()
    async updateConfig(@Body() body: any) {
        let config = await this.prisma.desktopConfig.findFirst();

        const data = {
            remoteUrl: body.remoteUrl,
            syncEmail: body.syncEmail,
            syncPassword: body.syncPassword !== undefined ? body.syncPassword : config?.syncPassword,
            syncToken: body.syncToken,
            autoSync: body.autoSync !== undefined ? body.autoSync : true,
        };

        if (config) {
            config = await this.prisma.desktopConfig.update({
                where: { id: config.id },
                data,
            });
        } else {
            config = await this.prisma.desktopConfig.create({
                data,
            });
        }
        return config;
    }
    @Post('sync')
    async triggerSync() {
        const config = await this.prisma.desktopConfig.findFirst();
        if (!config?.remoteUrl || !config?.syncToken) {
            throw new HttpException('Sync not configured. Please connect to your cloud workspace first.', HttpStatus.BAD_REQUEST);
        }

        const result = await this.desktopSync.syncWithRemote(false, true);
        if (!result.success) {
            throw new HttpException(result.message || 'Sync failed', HttpStatus.CONFLICT);
        }

        const updatedConfig = await this.prisma.desktopConfig.findFirst();
        return {
            success: true,
            lastSyncAt: result.lastSyncAt || updatedConfig?.lastSyncAt || null,
        };
    }

    @Post('setup')
    async setupDesktop(@Body() body: { remoteUrl: string; email: string; password: string }) {
        const { remoteUrl, email, password } = body;
        const baseUrl = remoteUrl.replace(/\/$/, '');

        try {
            // 1. Authenticate with remote API
            const authRes = await axios.post(`${baseUrl}/auth/login`, {
                email,
                password,
            });

            const { access_token, user } = authRes.data;
            if (!access_token || !user) {
                throw new Error('Invalid response from remote server');
            }

            if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
                throw new HttpException('Only owners and managers can setup the desktop app', HttpStatus.FORBIDDEN);
            }

            // 2. Save config
            let config = await this.prisma.desktopConfig.findFirst();
            const data = {
                remoteUrl: baseUrl,
                syncEmail: email,
                syncPassword: password,
                syncToken: access_token,
                autoSync: true,
            };

            if (config) {
                await this.prisma.desktopConfig.update({ where: { id: config.id }, data });
            } else {
                await this.prisma.desktopConfig.create({ data });
            }

            // 3. Trigger initial sync (cloning)
            await this.desktopSync.syncWithRemote();

            return { success: true };
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Setup failed';
            throw new HttpException(message, error.response?.status || HttpStatus.BAD_REQUEST);
        }
    }

    @Post('hard-reset')
    async hardResetLocalDb() {
        if (process.env.LOCAL_BUNDLE !== 'true') {
            throw new HttpException('Available only on Desktop version', HttpStatus.FORBIDDEN);
        }

        try {
            // Planifier l'arrêt et la suppression de la BD dans 1 seconde pour laisser le temps de répondre
            setTimeout(async () => {
                try {
                    await this.prisma.$disconnect();
                    const fs = require('fs');
                    const path = require('path');
                    const dbPath = path.join(process.env.APP_DATA_DIR || '', 'stock.db');
                    if (fs.existsSync(dbPath)) {
                        fs.unlinkSync(dbPath);
                    }
                    process.exit(0); // Quitte le processus Node, ce qui coupera la connexion avec le Frontend
                } catch (e) {
                    console.error('Failed to hard reset local DB', e);
                }
            }, 1000);

            return { success: true, message: 'La base de données locale va être supprimée. L\'application va redémarrer.' };
        } catch (error: any) {
            throw new HttpException(`Hard reset failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
