const { app, BrowserWindow, dialog, utilityProcess } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let backendProcess = null;
let splashWindow = null;
let mainWindow = null;
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

function pingHealth(url) {
  const http = require('http');
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(urls, timeoutMs = 30000, isBackendAlive, onProgress) {
  const start = Date.now();
  const list = Array.isArray(urls) ? urls : [urls];
  let lastLog = 0;
  while (Date.now() - start < timeoutMs) {
    if (typeof isBackendAlive === 'function' && !isBackendAlive()) {
      log('Backend process exited before health check succeeded');
      return false;
    }
    const elapsed = Date.now() - start;
    if (elapsed - lastLog > 5000) {
      const sec = Math.round(elapsed / 1000);
      log(`Waiting for health (${sec}s): ${list[0]}`);
      if (typeof onProgress === 'function') onProgress(sec);
      lastLog = elapsed;
    }
    for (const url of list) {
      if (await pingHealth(url)) {
        log(`Health OK: ${url}`);
        return true;
      }
    }
    await sleep(500);
  }
  log(`Health timeout after ${Math.round((Date.now() - start) / 1000)}s`);
  return false;
}

function readLogTail(filePath, maxLines = 40) {
  try {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    return lines.slice(-maxLines).join('\n');
  } catch {
    return '';
  }
}

function getAppDataDir() {
  // Windows: this is %APPDATA% (Roaming)
  const base = app.getPath('appData');
  return path.join(base, 'StockManagement');
}

/** Ensures %APPDATA%/StockManagement/stock.db path is ready */
function ensureStockDatabase(appDataDir) {
  fs.mkdirSync(appDataDir, { recursive: true });
  const dbPath = path.join(appDataDir, 'stock.db');
  
  let isEmptyOrMissing = true;
  if (fs.existsSync(dbPath)) {
    try {
      isEmptyOrMissing = fs.statSync(dbPath).size === 0;
    } catch { }
  }

  if (isEmptyOrMissing) {
    // try to find the seed db
    const devSeed = path.join(__dirname, '..', 'backend', 'generated', 'desktop-stock.db');
    // package.json copies it to backend/seed/desktop-stock.db
    const prodSeed = process.resourcesPath ? path.join(process.resourcesPath, 'backend', 'seed', 'desktop-stock.db') : null;
    
    if (fs.existsSync(devSeed)) {
      fs.copyFileSync(devSeed, dbPath);
      log(`Copied seed DB from ${devSeed} to ${dbPath}`);
    } else if (prodSeed && fs.existsSync(prodSeed)) {
      fs.copyFileSync(prodSeed, dbPath);
      log(`Copied seed DB from ${prodSeed} to ${dbPath}`);
    } else {
      log('Seed DB not found, stock.db will be created empty.');
    }
  }

  let size = 0;
  try {
    if (fs.existsSync(dbPath)) size = fs.statSync(dbPath).size;
  } catch { }

  log(`stock.db path=${dbPath} size=${size} bytes`);
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

  const backendRoot = path.resolve(path.dirname(backendEntry), '..');
  const sqliteClientIndex = path.join(backendRoot, 'generated', 'sqlite-client', 'index.js');
  const prismaEngine = path.join(backendRoot, 'generated', 'sqlite-client', 'query_engine-windows.dll.node');
  if (!fs.existsSync(sqliteClientIndex)) {
    missing.push(`SQLite client missing: ${sqliteClientIndex}`);
  }
  if (process.platform === 'win32' && !fs.existsSync(prismaEngine)) {
    missing.push(`Prisma engine missing (antivirus may have deleted it): ${prismaEngine}`);
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

let splashStatusText = 'Initialisation…';

function setSplashStatus(message) {
  splashStatusText = String(message || '');
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents
    .executeJavaScript(`window.setStatus && window.setStatus(${JSON.stringify(splashStatusText)})`)
    .catch(() => {});
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 320,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#2563eb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.webContents.once('did-finish-load', () => {
    setSplashStatus(splashStatusText);
  });
  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.show();
  });
  return splashWindow;
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

async function createMainWindow(port) {
  setSplashStatus('Chargement de l\'interface…');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
    },
  });

  try {
    await mainWindow.webContents.session.clearStorageData({
      storages: ['serviceworkers', 'cachestorage'],
    });
  } catch { }

  const showMain = () => {
    closeSplashWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  };

  mainWindow.once('ready-to-show', showMain);
  mainWindow.webContents.on('did-fail-load', () => {
    setSplashStatus('Erreur de chargement. Nouvelle tentative…');
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
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

function startBackendProcess(entry, backendRoot, env, backendLogPath, logsDir) {
  const logBackend = (chunk) => {
    if (!chunk) return;
    try {
      fs.appendFileSync(backendLogPath, chunk);
    } catch { }
  };

  // Fresh log per session (easier to debug on another PC).
  try {
    fs.mkdirSync(path.dirname(backendLogPath), { recursive: true });
    fs.writeFileSync(backendLogPath, `[${new Date().toISOString()}] Backend starting...\n`);
  } catch { }

  const useSpawn = process.env.DESKTOP_BACKEND_SPAWN === '1' || process.platform === 'win32';

  if (useSpawn) {
    log(`Backend spawn (ELECTRON_RUN_AS_NODE): ${process.execPath} ${entry}`);
    const child = spawn(process.execPath, [entry], {
      cwd: backendRoot,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', logBackend);
    child.stderr?.on('data', logBackend);
    child.on('spawn', () => {
      log(`Backend spawned (pid=${child.pid})`);
    });
    child.on('error', (err) => {
      log(`Backend spawn error: ${err && err.stack ? err.stack : String(err)}`);
    });
    child.on('exit', (code) => {
      log(`Backend exited (code=${code})`);
      backendProcess = null;
    });
    return child;
  }

  log(`Backend utilityProcess.fork: ${entry}`);
  const child = utilityProcess.fork(entry, [], {
    cwd: backendRoot,
    env,
    stdio: 'pipe',
    serviceName: 'stock-backend',
  });
  child.stdout?.on('data', logBackend);
  child.stderr?.on('data', logBackend);
  child.on('spawn', () => {
    log(`Backend spawned (pid=${child.pid})`);
  });
  child.on('error', (err) => {
    log(`Backend process error: ${err && err.stack ? err.stack : String(err)}`);
  });
  child.on('exit', (code) => {
    log(`Backend exited (code=${code})`);
    backendProcess = null;
  });
  return child;
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
    log(`Backend log: ${backendLogPath}`);
    backendProcess = startBackendProcess(entry, backendRoot, env, backendLogPath, logsDir);
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
    const win = mainWindow && !mainWindow.isDestroyed()
      ? mainWindow
      : splashWindow && !splashWindow.isDestroyed()
        ? splashWindow
        : null;
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

  createSplashWindow();
  setSplashStatus('Initialisation…');

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

  setSplashStatus('Préparation de la base de données…');
  startBackend({ port, appDataDir, frontendDistDir });

  setSplashStatus('Démarrage du serveur…');
  const healthUrls = [
    `http://127.0.0.1:${port}/api/health/live`,
    `http://localhost:${port}/api/health/live`,
    `http://127.0.0.1:${port}/api/health`,
  ];
  const isBackendAlive = () => backendProcess && backendProcess.exitCode == null && !backendProcess.killed;
  setSplashStatus('Connexion au serveur…');
  const ok = await waitForHealth(healthUrls, 180000, isBackendAlive, (sec) => {
    setSplashStatus(sec > 0 ? `Connexion au serveur… (${sec} s)` : 'Connexion au serveur…');
  });
  if (!ok) {
    closeSplashWindow();
    log('Health check failed; quitting app');
    const tail = readLogTail(path.join(appDataDir, 'logs', 'backend.log'));
    try {
      dialog.showErrorBox(
        'StockManagement',
        `Le backend ne démarre pas (jusqu'à 3 min).\n\n` +
          `1) Ouvre: ${path.join(appDataDir, 'logs', 'backend.log')}\n` +
          `2) Autorise l'app dans l'antivirus (Prisma: query_engine-windows.dll.node)\n` +
          `3) Installe VC++ Redistributable x64 si besoin\n\n` +
          (tail ? `Dernières lignes:\n${tail}` : '')
      );
    } catch { }
    app.quit();
    return;
  }

  await createMainWindow(port);
});
