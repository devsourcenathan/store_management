import { Module } from '@nestjs/common';
import { OrganizationLandingController } from './organization-landing.controller';
import { OrganizationLandingService } from './organization-landing.service';
import { HtmlParserService } from './services/html-parser.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [OrganizationLandingController],
    providers: [OrganizationLandingService, HtmlParserService],
})
export class OrganizationLandingModule { }
