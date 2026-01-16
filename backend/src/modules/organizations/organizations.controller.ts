import { Controller, Get, Patch, Put, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentOrganization } from '@/common/decorators/user.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private organizationsService: OrganizationsService) { }

    @Get('current')
    async getCurrent(@CurrentOrganization() organizationId: string) {
        return this.organizationsService.findOne(organizationId);
    }

    @Get('me')
    async getMe(@CurrentOrganization() organizationId: string) {
        return this.organizationsService.findOne(organizationId);
    }

    @Patch('current')
    async updateCurrent(
        @CurrentOrganization() organizationId: string,
        @Body() data: { name: string },
    ) {
        return this.organizationsService.update(organizationId, data);
    }

    @Put('me')
    @Patch('me')
    async updateMe(
        @CurrentOrganization() organizationId: string,
        @Body() data: UpdateOrganizationDto,
    ) {
        return this.organizationsService.update(organizationId, data);
    }
}
