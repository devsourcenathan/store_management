import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('desktop-config')
export class DesktopConfigController {
    constructor(private readonly prisma: PrismaService) { }

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
}
