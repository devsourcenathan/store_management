import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { LandingService } from './landing.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateLandingContentDto } from './dto/update-landing-content.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('landing')
export class LandingController {
    constructor(private readonly landingService: LandingService) { }

    @Public()
    @Get('content')
    async getContent() {
        return this.landingService.getLandingContent();
    }

    @Public()
    @Post('signup')
    async signup(@Body() dto: CreateOrganizationDto) {
        return this.landingService.registerOrganization(dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.GLOBAL_ADMIN)
    @Post('content')
    async updateContent(@Request() req, @Body() dto: UpdateLandingContentDto) {
        return this.landingService.updateLandingContent(req.user.id, dto);
    }
}
