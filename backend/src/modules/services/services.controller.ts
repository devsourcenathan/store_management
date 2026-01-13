import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.servicesService.findAll(req.user.organizationId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.servicesService.findOne(id);
    }

    @Post()
    async create(@Body() data: any, @Request() req: any) {
        return this.servicesService.create(data, req.user.organizationId);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.servicesService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.servicesService.remove(id);
    }

    // Offers Endpoints
    @Get(':id/offers')
    async findOffers(@Param('id') id: string) {
        return this.servicesService.findOffers(id);
    }

    @Post(':id/offers')
    async createOffer(@Param('id') id: string, @Body() data: any) {
        return this.servicesService.createOffer(id, data);
    }

    @Put(':id/offers/:offerId')
    async updateOffer(@Param('id') serviceId: string, @Param('offerId') offerId: string, @Body() data: any) {
        return this.servicesService.updateOffer(offerId, data);
    }

    // Options Endpoints
    @Get(':id/offers/:offerId/options')
    async findOptions(@Param('offerId') offerId: string) {
        return this.servicesService.findOptions(offerId);
    }

    @Post(':id/offers/:offerId/options')
    async createOption(@Param('offerId') offerId: string, @Body() data: any) {
        return this.servicesService.createOption(offerId, data);
    }

    @Put(':id/offers/:offerId/options/:optionId')
    async updateOption(@Param('optionId') optionId: string, @Body() data: any) {
        return this.servicesService.updateOption(optionId, data);
    }

    @Delete(':id/offers/:offerId/options/:optionId')
    async removeOption(@Param('optionId') optionId: string) {
        return this.servicesService.removeOption(optionId);
    }
}
