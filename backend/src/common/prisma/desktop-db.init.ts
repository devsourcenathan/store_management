import * as fs from 'fs';
import * as path from 'path';

function getSeedTemplatePath(): string | null {
    if (process.env.DESKTOP_SEED_DB_TEMPLATE) {
        const custom = path.resolve(process.env.DESKTOP_SEED_DB_TEMPLATE);
        if (fs.existsSync(custom)) return custom;
    }

    const resourcesPath = process.env.resourcesPath;
    if (resourcesPath) {
        const packaged = path.join(resourcesPath, 'backend', 'seed', 'desktop-stock.db');
        if (fs.existsSync(packaged)) return packaged;
    }

    const dev = path.resolve(__dirname, '../../../generated/desktop-stock.db');
    if (fs.existsSync(dev)) return dev;

    return null;
}

function loadSqlitePrisma(dbPath: string) {
    const sqliteClientPath = path.resolve(__dirname, '../../../generated/sqlite-client');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require(sqliteClientPath);
    const url = `file:${dbPath.replace(/\\/g, '/')}`;
    return new PrismaClient({
        datasources: { db: { url } },
    });
}

async function isDatabaseSeeded(dbPath: string): Promise<boolean> {
    let prisma: { user: { count: () => Promise<number> }; $disconnect: () => Promise<void> } | undefined;
    try {
        prisma = loadSqlitePrisma(dbPath);
        const count = await prisma.user.count();
        return count > 0;
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

function installSeedDatabase(dbPath: string, template: string): void {
    if (fs.existsSync(dbPath)) {
        const backup = `${dbPath}.bak-${Date.now()}`;
        try {
            fs.copyFileSync(dbPath, backup);
            console.log(`📁 Previous database backed up to ${backup}`);
        } catch {
            fs.unlinkSync(dbPath);
        }
    }
    fs.copyFileSync(template, dbPath);
    console.log(`✅ Desktop database initialized from seed (${dbPath})`);
}

/**
 * Ensures APP_DATA stock.db exists and contains seeded tables/users.
 * Replaces empty or legacy DB files that block login (missing users table).
 */
export async function ensureDesktopDatabase(appDataDir: string): Promise<void> {
    const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
    if (dbProvider !== 'sqlite') return;

    const resolved = path.resolve(appDataDir);
    fs.mkdirSync(resolved, { recursive: true });

    const dbPath = path.join(resolved, 'stock.db');
    const template = getSeedTemplatePath();
    if (!template) {
        console.warn(
            '⚠️ No desktop seed DB template found. Run: cd backend && npm run desktop:build-seed-db',
        );
        return;
    }

    if (!fs.existsSync(dbPath)) {
        installSeedDatabase(dbPath, template);
        return;
    }

    const seeded = await isDatabaseSeeded(dbPath);
    if (!seeded) {
        console.warn('⚠️ Desktop database missing schema or users — reinstalling from seed template');
        installSeedDatabase(dbPath, template);
    }
}
