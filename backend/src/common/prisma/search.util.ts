/** SQLite Prisma does not support `mode: 'insensitive'` on string filters. */
export function isSqliteProvider(): boolean {
    const dbProvider = (process.env.DB_PROVIDER || '').toLowerCase();
    const databaseUrl = process.env.DATABASE_URL || '';
    return dbProvider === 'sqlite' || databaseUrl.startsWith('file:');
}

/** Case-insensitive `contains` on Postgres; plain `contains` on SQLite (LIKE is case-insensitive by default). */
export function containsFilter(value: string): { contains: string; mode?: 'insensitive' } {
    if (isSqliteProvider()) {
        return { contains: value };
    }
    return { contains: value, mode: 'insensitive' };
}
