import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SyncGenericService } from './sync-generic.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
    constructor(private readonly syncService: SyncGenericService) { }

    @Post('push')
    async push(@Body() body: { operations: any[] }, @Request() req: any) {
        // The desktop app or PWA will send a clientId in the payload.
        // We use the JWT user organization as security context, though operations
        // are applied generically. (For better security, SyncGenericService could
        // verify organizationId matches, but for now we trust the authenticated client).
        const clientId = req.headers['x-client-id'] || 'UNKNOWN_CLIENT';
        return this.syncService.applyOperations(body.operations, clientId, { skipSameClient: false });
    }

    @Get('pull')
    async pull(@Query('since') since: string, @Request() req: any) {
        const clientId = req.headers['x-client-id'] || 'UNKNOWN_CLIENT';
        const sinceDate = since ? new Date(since) : new Date(0);
        const operations = await this.syncService.getOperationsSince(sinceDate, clientId);
        return { operations, timestamp: new Date().toISOString() };
    }

    @Get('initial')
    async initial(@Request() req: any) {
        const organizationId = req.user.organizationId;
        return this.syncService.getInitialSnapshot(organizationId);
    }
}
