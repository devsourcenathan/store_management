import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as PostgresPrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { withSyncExtension } from './prisma-sync.extension';

const globalForPrisma = global as unknown as {
    prisma: any;
    prismaExtended: any;
};
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
    public readonly client: any;
    private readonly extendedClient: any;

    constructor() {
        super();
        
        if (!globalForPrisma.prisma) {
            const PrismaClientCtor = loadPrismaClientCtor();
            // Ensure we load .env if process.env.DATABASE_URL is not set yet
            if (!process.env.DATABASE_URL) {
                const envPath = path.resolve(process.cwd(), '.env');
                if (fs.existsSync(envPath)) {
                    dotenv.config({ path: envPath });
                }
            }

            let dbUrl = process.env.DATABASE_URL;
            if (dbUrl && dbUrl.includes('supabase.co')) {
                // Supabase specific: Force transaction pooler (port 6543) to avoid EMAXCONNSESSION
                dbUrl = dbUrl.replace(':5432', ':6543');
                if (!dbUrl.includes('pgbouncer=true')) {
                    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
                }
                if (!dbUrl.includes('connection_limit')) {
                    dbUrl += '&connection_limit=1'; // with pgbouncer, 1 is enough for prisma to multiplex
                }
                console.log('🔗 [Prisma] Rewrote Supabase URL to use Transaction Pooler (port 6543)');
            } else if (dbUrl && dbUrl.startsWith('postgres') && !dbUrl.includes('connection_limit')) {
                dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=5';
                console.log('🔗 [Prisma] Added connection_limit=5 to PostgreSQL URL');
            }

            globalForPrisma.prisma = new PrismaClientCtor(dbUrl ? {
                datasources: {
                    db: {
                        url: dbUrl
                    }
                }
            } : undefined);
            
            globalForPrisma.prismaExtended = withSyncExtension(globalForPrisma.prisma);
        }

        this.client = globalForPrisma.prisma;
        this.extendedClient = globalForPrisma.prismaExtended;

        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (prop === 'client' || prop === 'extendedClient') return Reflect.get(target, prop, receiver);
                if (prop === 'onModuleInit' || prop === 'onModuleDestroy') {
                    return Reflect.get(target, prop, receiver).bind(target);
                }

                if (target.extendedClient && prop in target.extendedClient) {
                    const value = target.extendedClient[prop as any];
                    return typeof value === 'function' ? value.bind(target.extendedClient) : value;
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
        const isDesktop = process.env.LOCAL_BUNDLE === 'true';
        try {
            if (isDesktop) {
                console.log('[desktop] connecting to SQLite...');
                await Promise.race([
                    this.client.$connect(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Database connect timeout (30s)')), 30000),
                    ),
                ]);
            } else {
                await this.client.$connect();
            }
            console.log('✅ Database connected');
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            // Desktop: still start HTTP so Electron health + backend.log show the real error.
            if (!isDesktop) throw error;
        }
    }

    async onModuleDestroy() {
        await this.client.$disconnect();
    }
}
