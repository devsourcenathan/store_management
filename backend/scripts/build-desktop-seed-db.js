/**
 * Builds a pre-seeded SQLite DB for the desktop zip (edit prisma/desktop-seed.config.json first).
 * Output: backend/generated/desktop-stock.db
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'generated');
const schemaPath = path.join(outDir, 'schema.sqlite.prisma');
const dbPath = path.join(outDir, 'desktop-stock.db');
const configPath = path.join(root, 'prisma', 'desktop-seed.config.json');
const sqliteClientDir = path.join(outDir, 'sqlite-client');
const engineDll = path.join(sqliteClientDir, 'query_engine-windows.dll.node');
const sourceSchema = path.join(root, 'prisma', 'schema.prisma');

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
}

function run(cmd, extraEnv = {}) {
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
}

function isNewer(file, thanFile) {
  if (!fs.existsSync(file) || !fs.existsSync(thanFile)) return true;
  return fs.statSync(file).mtimeMs > fs.statSync(thanFile).mtimeMs;
}

function sqliteClientIsReady() {
  const indexJs = path.join(sqliteClientDir, 'index.js');
  if (!fs.existsSync(indexJs)) return false;
  if (process.platform === 'win32' && !fs.existsSync(engineDll)) return false;
  return true;
}

function shouldRegenerateClient() {
  if (!sqliteClientIsReady()) return true;
  if (isNewer(sourceSchema, schemaPath)) return true;
  if (isNewer(schemaPath, path.join(sqliteClientDir, 'index.js'))) return true;
  if (process.platform === 'win32' && isNewer(schemaPath, engineDll)) return true;
  return false;
}

function runPrismaGenerateWithRetry(maxAttempts = 5) {
  const cmd = `npx prisma generate --schema "${schemaPath}"`;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      run(cmd);
      return;
    } catch (err) {
      const msg = String(err.message || err);
      const locked =
        msg.includes('EPERM') ||
        msg.includes('operation not permitted') ||
        msg.includes('EBUSY');
      if (!locked || attempt === maxAttempts) {
        console.error('');
        console.error('❌ prisma generate failed.');
        console.error('   Ferme StockManagement.exe / Electron / `npm run start` (backend),');
        console.error('   puis relance: npm run desktop:build-seed-db');
        throw err;
      }
      const waitSec = attempt * 2;
      console.warn(
        `⚠️ Prisma engine locked (tentative ${attempt}/${maxAttempts}), nouvel essai dans ${waitSec}s...`,
      );
      sleepSync(waitSec * 1000);
    }
  }
}

function main() {
  if (!fs.existsSync(configPath)) {
    console.error(`Missing ${configPath}`);
    process.exit(1);
  }

  console.log('📦 Building desktop SQLite seed database...');
  console.log(`   Config: ${configPath}`);

  run('node scripts/gen-sqlite-schema.js');

  if (shouldRegenerateClient()) {
    console.log('🔧 Generating Prisma SQLite client...');
    try {
      runPrismaGenerateWithRetry();
    } catch (err) {
      if (sqliteClientIsReady()) {
        console.warn(
          '⚠️ prisma generate skipped (engine file locked) — using existing SQLite client.',
        );
      } else {
        throw err;
      }
    }
  } else {
    console.log('⏭️ Prisma SQLite client up to date — skipping generate');
  }

  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (e) {
      console.error(`Cannot remove ${dbPath}. Close apps using the DB and retry.`);
      throw e;
    }
  }

  const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;
  run(`npx prisma db push --schema "${schemaPath}" --accept-data-loss --skip-generate`, {
    DATABASE_URL: databaseUrl,
  });

  // run('npx ts-node prisma/seed-desktop.ts', {
  //   DATABASE_URL: databaseUrl,
  //   DESKTOP_SEED_CONFIG: configPath,
  // });

  if (!fs.existsSync(dbPath)) {
    console.error('Seed DB was not created:', dbPath);
    process.exit(1);
  }

  const sizeKb = Math.round(fs.statSync(dbPath).size / 1024);
  console.log(`✅ Desktop seed DB ready (${sizeKb} KB): ${dbPath}`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
