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
import { CashAdjustmentsService } from './cash-adjustments.service';
import { CreateCashAdjustmentDto } from './dto/create-cash-adjustment.dto';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, CurrentOrganization } from '@/common/decorators/user.decorator';

@Controller('cash-adjustments')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class CashAdjustmentsController {
    constructor(
        private readonly cashAdjustmentsService: CashAdjustmentsService,
        private readonly auditService: AuditService,
    ) {}

    /**
     * POST /cash-adjustments
     * Enregistre un nouvel ajustement de caisse
     */
    @Post()
    async create(
        @Body() dto: CreateCashAdjustmentDto,
        @CurrentUser() user: any,
        @CurrentOrganization() organizationId: string,
    ) {
        const adjustment = await this.cashAdjustmentsService.create(dto, user.id, organizationId);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'CREATE',
            entity: 'CashAdjustment',
            entityId: adjustment.id,
            changes: {
                storeId: dto.storeId,
                expected: dto.expected,
                counted: dto.counted,
                difference: adjustment.difference,
                reason: dto.reason,
            },
        });

        return adjustment;
    }

    /**
     * GET /cash-adjustments
     * Liste les ajustements avec filtres optionnels
     */
    @Get()
    findAll(
        @CurrentOrganization() organizationId: string,
        @Query('storeId') storeId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('createdBy') createdBy?: string,
    ) {
        return this.cashAdjustmentsService.findAll({
            organizationId,
            storeId,
            startDate,
            endDate,
            createdBy,
        });
    }
}
