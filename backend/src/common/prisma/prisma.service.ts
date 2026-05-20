import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import * as path from 'path';

function loadPrismaClientCtor() {
    const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
    if (dbProvider === 'sqlite') {
        // Generated via: `npm run prisma:sqlite:generate`
        // At runtime, compiled JS lives under `dist/common/prisma`, so we resolve from that location.
        const sqliteClientPath = path.resolve(__dirname, '../../../generated/sqlite-client');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sqliteClient = require(sqliteClientPath);
        return sqliteClient.PrismaClient;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const postgresClient = require('@prisma/client');
    return postgresClient.PrismaClient;
}

@Injectable()
export class PrismaService extends PostgresPrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly client: any;

    constructor() {
        super();
        const PrismaClientCtor = loadPrismaClientCtor();
        this.client = new PrismaClientCtor();

        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (prop === 'client') return Reflect.get(target, prop, receiver);
                if (prop === 'onModuleInit' || prop === 'onModuleDestroy') {
                    return Reflect.get(target, prop, receiver).bind(target);
                }

                if (target.client && prop in target.client) {
                    const value = target.client[prop as any];
                    return typeof value === 'function' ? value.bind(target.client) : value;
                }

                const fallback = (target as any)[prop as any];
                return typeof fallback === 'function' ? fallback.bind(target) : fallback;
            },
        });
    }
    async onModuleInit() {
        await this.client.$connect();
        console.log('✅ Database connected');
    }

    async onModuleDestroy() {
        await this.client.$disconnect();
    }
}
