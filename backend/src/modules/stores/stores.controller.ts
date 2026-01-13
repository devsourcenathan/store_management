import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
    constructor(private readonly storesService: StoresService) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.storesService.findAll(req.user.organizationId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.storesService.findOne(id);
    }

    @Post()
    async create(@Body() data: any, @Request() req: any) {
        // req.user.id comes from JwtStrategy.validate() which maps payload.sub to id
        return this.storesService.create(data, req.user.organizationId, req.user.id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.storesService.update(id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.storesService.remove(id);
    }
}
