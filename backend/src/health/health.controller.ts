import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    /** Fast liveness probe (no DB) — used by Electron startup. */
    @Get('live')
    live() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }

    @Get()
    async check() {
        // Check database connection
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: 'connected',
            };
        } catch (error) {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error.message,
            };
        }
    }

    @Get('debug-sentry')
    getError() {
        throw new Error('Sentry Test Error from Backend Health Check');
    }
}
