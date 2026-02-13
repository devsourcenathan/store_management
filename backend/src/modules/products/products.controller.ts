import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentOrganization, CurrentUser } from '@/common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, StoreAuthGuard)
export class ProductsController {
    constructor(
        private productsService: ProductsService,
        private auditService: AuditService,
    ) { }

    @Get()
    async findAll(
        @CurrentOrganization() organizationId: string,
        @Query() query: GetProductsDto,
    ) {
        return this.productsService.findAll(organizationId, query);
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
        @CurrentUser() user: any,
    ) {
        const product = await this.productsService.create(data, organizationId, user.id);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'CREATE',
            entity: 'Product',
            entityId: product.id,
            changes: data,
        });

        return product;
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
        @CurrentUser() user: any,
    ) {
        const product = await this.productsService.update(id, data, organizationId);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'UPDATE',
            entity: 'Product',
            entityId: id,
            changes: data,
        });

        return product;
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async delete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
        @CurrentUser() user: any,
    ) {
        const product = await this.productsService.delete(id, organizationId);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'DELETE',
            entity: 'Product',
            entityId: id,
            changes: {},
        });

        return product;
    }

    @Get('category/:categoryId')
    async findByCategory(
        @Param('categoryId') categoryId: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.productsService.findByCategory(categoryId, organizationId);
    }
}
