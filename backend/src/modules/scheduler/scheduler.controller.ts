import { Controller, Post, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Décommentez pour sécuriser en prod
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '@prisma/client';

@Controller('scheduler')
// @UseGuards(JwtAuthGuard) // Sécurité recommandée
export class SchedulerController {
    constructor(private readonly schedulerService: SchedulerService) { }

    @Post('trigger/daily')
    // @Roles(UserRole.OWNER, UserRole.GLOBAL_ADMIN)
    async triggerDailyReport() {
        await this.schedulerService.sendDailyReports();
        return { message: 'Rapport journalier déclenché' };
    }

    @Post('trigger/weekly')
    async triggerWeeklyReport() {
        await this.schedulerService.sendWeeklyReports();
        return { message: 'Rapport hebdomadaire déclenché' };
    }

    @Post('trigger/monthly')
    async triggerMonthlyReport() {
        await this.schedulerService.sendMonthlyReports();
        return { message: 'Rapport mensuel déclenché' };
    }
}
