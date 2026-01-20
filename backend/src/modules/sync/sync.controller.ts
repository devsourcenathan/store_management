import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
    constructor(private readonly syncService: SyncService) { }

    @Post('push')
    async push(@Body() body: { operations: any[] }, @Request() req: any) {
        const userId = req.user.id;
        const organizationId = req.user.organizationId;

        return this.syncService.processOperations(body.operations, userId, organizationId);
    }

    @Get('pull')
    async pull(@Query('since') since: string, @Request() req: any) {
        const organizationId = req.user.organizationId;

        return this.syncService.getUpdates(since, organizationId);
    }
}
