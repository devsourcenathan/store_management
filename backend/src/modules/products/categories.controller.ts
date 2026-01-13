import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentOrganization } from '@/common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private productsService: ProductsService) { }

    @Get()
    async findAll(@CurrentOrganization() organizationId: string) {
        return this.productsService.findAllCategories(organizationId);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async create(
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.createCategory(data, organizationId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.updateCategory(id, data, organizationId);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async delete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.deleteCategory(id, organizationId);
    }
}
