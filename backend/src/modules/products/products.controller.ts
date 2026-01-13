import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentOrganization } from '@/common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
    constructor(private productsService: ProductsService) { }

    @Get()
    async findAll(@CurrentOrganization() organizationId: string) {
        return this.productsService.findAll(organizationId);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.findOne(id, organizationId);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async create(
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.create(data, organizationId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.update(id, data, organizationId);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async delete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.delete(id, organizationId);
    }

    @Get('category/:categoryId')
    async findByCategory(
        @Param('categoryId') categoryId: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.findByCategory(categoryId, organizationId);
    }
}
