import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { MiscTransactionsService } from './misc-transactions.service';
import { CreateMiscTransactionDto } from './dto/create-misc-transaction.dto';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, CurrentOrganization } from '@/common/decorators/user.decorator';
import { MiscTransactionType } from '@prisma/client';

@Controller('misc-transactions')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class MiscTransactionsController {
    constructor(
        private readonly miscTransactionsService: MiscTransactionsService,
        private readonly auditService: AuditService,
    ) {}

    /**
     * POST /misc-transactions
     * Enregistre un nouveau mouvement non standard
     */
    @Post()
    async create(
        @Body() dto: CreateMiscTransactionDto,
        @CurrentUser() user: any,
        @CurrentOrganization() organizationId: string,
    ) {
        const transaction = await this.miscTransactionsService.create(
            dto,
            user.id,
            organizationId,
        );

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'CREATE',
            entity: 'MiscTransaction',
            entityId: transaction.id,
            changes: {
                storeId: dto.storeId,
                type: dto.type,
                amount: dto.amount,
                description: dto.description,
            },
        });

        return transaction;
    }

    /**
     * GET /misc-transactions
     * Liste les transactions avec filtres optionnels
     */
    @Get()
    findAll(
        @CurrentOrganization() organizationId: string,
        @Query('storeId') storeId?: string,
        @Query('type') type?: MiscTransactionType,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('createdBy') createdBy?: string,
    ) {
        return this.miscTransactionsService.findAll({
            organizationId,
            storeId,
            type,
            startDate,
            endDate,
            createdBy,
        });
    }
}
