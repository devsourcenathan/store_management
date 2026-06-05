import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { I18nContext } from 'nestjs-i18n';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class StoreAuthGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const i18n = I18nContext.current();

        if (!user) {
            return false;
        }

        // Owners and Managers have access to all stores
        if (user.role === UserRole.OWNER || user.role === UserRole.MANAGER) {
            return true;
        }

        // Try to find storeId in params, query, or body
        const storeId =
            request.params.storeId ||
            request.query.storeId ||
            request.body.storeId;

        if (!storeId) {
            // STAFF users MUST provide a storeId to operate in context
            throw new BadRequestException(
                i18n ? i18n.t('messages.error.store_id_required') : 'Store ID is required for staff members'
            );
        }

        // Check if user is assigned to this store
        const hasAccess = user.stores.some((s: any) => s.storeId === storeId);

        if (!hasAccess) {
            throw new ForbiddenException(
                i18n ? i18n.t('messages.error.store_access_denied') : 'You do not have access to this store'
            );
        }

        return true;
    }
}
