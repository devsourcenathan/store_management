import { Module } from '@nestjs/common';
import { OrganizationLandingController } from './organization-landing.controller';
import { OrganizationLandingService } from './organization-landing.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [OrganizationLandingController],
    providers: [OrganizationLandingService],
})
export class OrganizationLandingModule { }
