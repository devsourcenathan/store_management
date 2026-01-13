import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

@Injectable()
export class StoreAuthGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

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
            // If the endpoint doesn't require a specific store, we don't block here
            // OR if it depends on implementation. 
            // Better safe: if we explicitly use this guard, we expect a storeId.
            return true;
        }

        // Check if user is assigned to this store
        const hasAccess = user.stores.some((s: any) => s.storeId === storeId);

        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this store');
        }

        return true;
    }
}
