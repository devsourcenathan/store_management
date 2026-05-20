const { app, BrowserWindow, dialog, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');

let backendProcess = null;
let logFile = null;
let pendingEarlyLogs = [];

function logEarly(message) {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    pendingEarlyLogs.push(line);
    if (pendingEarlyLogs.length > 200) pendingEarlyLogs.shift();
  } catch { }
}

function safeOpenAppend(filePath, fallbackDir) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    return { fd: fs.openSync(filePath, 'a'), path: filePath };
  } catch (e) {
    try {
      const fallbackPath = path.join(
        fallbackDir || path.dirname(filePath),
        `${path.basename(filePath, path.extname(filePath))}-${Date.now()}${path.extname(filePath)}`
      );
      fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
      return { fd: fs.openSync(fallbackPath, 'a'), path: fallbackPath };
    } catch {
      return { fd: null, path: null, error: e };
    }
  }
}

function log(message) {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    if (logFile) {
      if (pendingEarlyLogs && pendingEarlyLogs.length) {
        try {
          fs.appendFileSync(logFile, pendingEarlyLogs.join(''), 'utf8');
        } catch { }
        pendingEarlyLogs = [];
      }
      fs.appendFileSync(logFile, line, 'utf8');
    } else {
      logEarly(message);
    }
  } catch { }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(url, timeoutMs = 30000) {
  const start = Date.now();
  // Lazy require to avoid ESM issues
  const http = require('http');
  let lastLog = 0;
  while (Date.now() - start < timeoutMs) {
    const elapsed = Date.now() - start;
    if (elapsed - lastLog > 5000) {
      log(`Waiting for health (${Math.round(elapsed / 1000)}s): ${url}`);
      lastLog = elapsed;
    }
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await sleep(500);
  }
  log(`Health timeout after ${Math.round((Date.now() - start) / 1000)}s: ${url}`);
  return false;
}

function getAppDataDir() {
  // Windows: this is %APPDATA% (Roaming)
  const base = app.getPath('appData');
  return path.join(base, 'StockManagement');
}

const MIN_STOCK_DB_BYTES = 50 * 1024;

function getSeedDatabaseTemplate() {
  if (process.resourcesPath) {
    const packaged = path.join(process.resourcesPath, 'backend', 'seed', 'desktop-stock.db');
    if (fs.existsSync(packaged)) return packaged;
  }
  const dev = path.join(__dirname, '..', 'backend', 'generated', 'desktop-stock.db');
  if (fs.existsSync(dev)) return dev;
  return null;
}

/** Install or repair %APPDATA%/stock.db (must not be 0 bytes). */
function ensureStockDatabase(appDataDir) {
  fs.mkdirSync(appDataDir, { recursive: true });
  const dbPath = path.join(appDataDir, 'stock.db');
  const template = getSeedDatabaseTemplate();

  let size = 0;
  try {
    if (fs.existsSync(dbPath)) size = fs.statSync(dbPath).size;
  } catch { }

  log(`stock.db path=${dbPath} size=${size} bytes`);

  if (size >= MIN_STOCK_DB_BYTES) {
    return dbPath;
  }

  if (!template) {
    log('ERROR: desktop-stock.db seed template not found in app resources');
    try {
      dialog.showErrorBox(
        'StockManagement',
        'Base de données seed introuvable dans l\'application.\n\nRebuild:\ncd desktop && npm run dist:zip'
      );
    } catch { }
    return dbPath;
  }

  const templateSize = fs.statSync(template).size;
  log(`seed template=${template} size=${templateSize} bytes`);
  if (templateSize < MIN_STOCK_DB_BYTES) {
    log('ERROR: seed template file is too small / corrupt');
    return dbPath;
  }

  try {
    if (fs.existsSync(dbPath)) {
      if (size > 0) {
        const backup = `${dbPath}.bak-${Date.now()}`;
        fs.copyFileSync(dbPath, backup);
        log(`Backed up invalid stock.db to ${backup}`);
      } else {
        fs.unlinkSync(dbPath);
        log('Removed empty stock.db (0 bytes)');
      }
    }
    fs.copyFileSync(template, dbPath);
    const installed = fs.statSync(dbPath).size;
    log(`Installed stock.db from seed (${installed} bytes)`);
  } catch (e) {
    log(`ERROR installing stock.db: ${e && e.message ? e.message : String(e)}`);
    try {
      dialog.showErrorBox(
        'StockManagement',
        `Impossible d'installer la base SQLite:\n${String(e && e.message ? e.message : e)}\n\n` +
          'Ferme l\'app, supprime %APPDATA%\\StockManagement\\stock.db, relance.'
      );
    } catch { }
  }

  return dbPath;
}

function getBackendEntry() {
  // In dev (repo): desktop/ is sibling of backend/
  const dev = path.join(__dirname, '..', 'backend', 'dist', 'main.js');
  if (fs.existsSync(dev)) return dev;

  // In packaged app, backend is expected to be bundled next to this file
  const prod = path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  return prod;
}

function getBackendNodeModulesDir(entry) {
  // entry is either repo backend/dist/main.js or resources/backend/dist/main.js
  // In both cases, node_modules is located at backend/node_modules.
  return path.resolve(path.dirname(entry), '..', 'node_modules');
}

function assertLocalBundleFiles({ backendEntry, backendNodeModulesDir, frontendDistDir }) {
  const missing = [];

  if (!fs.existsSync(backendEntry)) missing.push(`Backend entry missing: ${backendEntry}`);
  if (!fs.existsSync(frontendDistDir)) missing.push(`Frontend dist missing: ${frontendDistDir}`);

  // Runtime deps that must exist when we require the backend entry.
  const reflectMetadataDir = path.join(backendNodeModulesDir, 'reflect-metadata');
  if (!fs.existsSync(reflectMetadataDir)) {
    missing.push(`Backend dependency missing: ${reflectMetadataDir}`);
  }

  if (missing.length) {
    const msg = missing.join('\n');
    log(msg);
    try {
      dialog.showErrorBox(
        'StockManagement',
        `Fichiers manquants pour démarrer l'app.\n\n${msg}\n\nRebuild requis:\n- frontend: npm run build\n- backend: npm install + npm run build\n- desktop: npm run dist:zip`
      );
    } catch { }
    return false;
  }

  return true;
}

async function createWindow(port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true
    }
  });

  try {
    await win.webContents.session.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
  } catch { }

  await win.loadURL(`http://127.0.0.1:${port}/`);
  win.show();
}

function buildBackendEnv({ port, appDataDir, frontendDistDir }) {
  const dbFile = path.join(appDataDir, 'stock.db').replace(/\\/g, '/');
  const env = { ...process.env };
  // Never let host .env / Postgres URL leak into the desktop SQLite child process.
  delete env.DATABASE_URL;
  return {
    ...env,
    PORT: String(port),
    DATABASE_URL: `file:${dbFile}`,
    CORS_ORIGIN: `http://127.0.0.1:${port},http://localhost:${port}`,
    APP_DATA_DIR: appDataDir,
    LOCAL_BUNDLE: 'true',
    DB_PROVIDER: 'sqlite',
    MEDIA_STORAGE: 'local',
    PRISMA_CLIENT_ENGINE_TYPE: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'library',
    SERVE_FRONTEND_DIR: frontendDistDir,
    JWT_SECRET:
      process.env.JWT_SECRET ||
      'desktop-local-jwt-secret-change-before-production',
  };
}

function startBackend({ port, appDataDir, frontendDistDir }) {
  ensureStockDatabase(appDataDir);
  fs.mkdirSync(appDataDir, { recursive: true });
  try {
    const logsDir = path.join(appDataDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    logFile = path.join(logsDir, 'desktop.log');
  } catch { }

  const entry = getBackendEntry();
  const backendRoot = path.resolve(path.dirname(entry), '..');
  const backendNodeModulesDir = getBackendNodeModulesDir(entry);
  const logsDir = path.join(appDataDir, 'logs');
  const backendLogPath = path.join(logsDir, 'backend.log');

  log(`Electron execPath: ${process.execPath}`);
  log(`Backend entry exists: ${fs.existsSync(entry)} (${entry})`);
  log(`Frontend dist exists: ${fs.existsSync(frontendDistDir)} (${frontendDistDir})`);
  log(`Backend node_modules: ${backendNodeModulesDir}`);
  log(`Backend cwd: ${backendRoot}`);

  if (!assertLocalBundleFiles({ backendEntry: entry, backendNodeModulesDir, frontendDistDir })) {
    app.quit();
    return;
  }

  try {
    const env = buildBackendEnv({ port, appDataDir, frontendDistDir });
    const opened = safeOpenAppend(backendLogPath, logsDir);
    const logBackend = (chunk) => {
      if (!chunk) return;
      if (opened.fd) {
        try {
          fs.writeSync(opened.fd, chunk);
        } catch { }
      }
    };
    if (opened.path) log(`Backend log: ${opened.path}`);
    else log(`Backend log open failed: ${backendLogPath}`);

    // utilityProcess runs Nest in an isolated Node child (avoids Electron singleton + broken DI).
    log(`Backend utilityProcess.fork: ${entry}`);
    backendProcess = utilityProcess.fork(entry, [], {
      cwd: backendRoot,
      env,
      stdio: 'pipe',
      serviceName: 'stock-backend',
    });

    backendProcess.stdout?.on('data', logBackend);
    backendProcess.stderr?.on('data', logBackend);
    backendProcess.on('spawn', () => {
      log(`Backend spawned (pid=${backendProcess.pid})`);
    });
    backendProcess.on('error', (err) => {
      log(`Backend process error: ${err && err.stack ? err.stack : String(err)}`);
      try {
        dialog.showErrorBox(
          'StockManagement',
          `Impossible de démarrer le backend:\n${String(err && err.message ? err.message : err)}`
        );
      } catch { }
      app.quit();
    });
    backendProcess.on('exit', (code) => {
      log(`Backend exited (code=${code})`);
      backendProcess = null;
    });
  } catch (e) {
    log(`Backend start error: ${e && e.message ? e.message : String(e)}`);
    throw e;
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  logEarly('Single instance lock not acquired; quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    const wins = BrowserWindow.getAllWindows();
    const win = wins && wins[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.whenReady().then(async () => {
  const port = Number(process.env.LOCAL_PORT || 3100);
  const appDataDir = getAppDataDir();
  logFile = path.join(appDataDir, 'logs', 'desktop.log');

  process.on('uncaughtException', (err) => {
    log(`UncaughtException: ${err && err.stack ? err.stack : String(err)}`);
    try { dialog.showErrorBox('StockManagement', `Erreur:\n${String(err && err.message ? err.message : err)}`); } catch { }
  });
  process.on('unhandledRejection', (reason) => {
    log(`UnhandledRejection: ${reason && reason.stack ? reason.stack : String(reason)}`);
    try { dialog.showErrorBox('StockManagement', `Erreur (promise):\n${String(reason && reason.message ? reason.message : reason)}`); } catch { }
  });

  // In dev (repo): desktop/ is sibling of frontend/
  const devFrontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const frontendDistDir = fs.existsSync(devFrontendDist)
    ? devFrontendDist
    : path.join(process.resourcesPath, 'frontend', 'dist');

  startBackend({ port, appDataDir, frontendDistDir });

  const ok = await waitForHealth(`http://127.0.0.1:${port}/api/health`, 90000);
  if (!ok) {
    log('Health check failed; quitting app');
    try {
      dialog.showErrorBox(
        'StockManagement',
        `Le backend ne démarre pas.\n\nVérifie le log:\n${path.join(appDataDir, 'logs', 'desktop.log')}`
      );
    } catch { }
    app.quit();
    return;
  }

  await createWindow(port);
});
