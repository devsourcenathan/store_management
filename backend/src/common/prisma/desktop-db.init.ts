import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

function loadSqlitePrisma(dbPath: string) {
    const sqliteClientPath = path.resolve(__dirname, '../../../generated/sqlite-client');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require(sqliteClientPath);
    const url = `file:${dbPath.replace(/\\/g, '/')}`;
    return new PrismaClient({
        datasources: { db: { url } },
    });
}

async function isDatabaseInitialized(dbPath: string): Promise<boolean> {
    let prisma: { user: { count: () => Promise<number> }; $disconnect: () => Promise<void> } | undefined;
    try {
        prisma = loadSqlitePrisma(dbPath);
        await prisma.user.count(); // Will throw if the table doesn't exist
        return true;
    } catch {
        return false;
    } finally {
        if (prisma) {
            try {
                await prisma.$disconnect();
            } catch {
                /* ignore */
            }
        }
    }
}

/**
 * Ensures APP_DATA stock.db exists and has the correct schema.
 */
export async function ensureDesktopDatabase(appDataDir: string): Promise<void> {
    const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
    if (dbProvider !== 'sqlite') return;

    const resolved = path.resolve(appDataDir);
    fs.mkdirSync(resolved, { recursive: true });

    const dbPath = path.join(resolved, 'stock.db');
    const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

    const initialized = await isDatabaseInitialized(dbPath);
    if (!initialized) {
        console.log('⚠️ Desktop database missing schema. Initializing via prisma db push...');
        try {
            const schemaPath = path.resolve(__dirname, '../../../generated/schema.sqlite.prisma');
            if (fs.existsSync(schemaPath)) {
                execSync(`npx prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
                    env: { ...process.env, DATABASE_URL: dbUrl },
                    stdio: 'inherit'
                });
                console.log(`✅ Desktop database schema initialized (${dbPath})`);
            } else {
                console.warn('⚠️ SQLite schema file not found, cannot run db push.');
            }
        } catch (err) {
            console.error('Failed to initialize local SQLite DB schema:', err);
        }
    } else {
        console.log(`✅ Desktop database already initialized (${dbPath})`);
    }
}
