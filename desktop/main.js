const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let backendProcess = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(url, timeoutMs = 30000) {
  const start = Date.now();
  // Lazy require to avoid ESM issues
  const http = require('http');
  while (Date.now() - start < timeoutMs) {
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
  return false;
}

function getAppDataDir() {
  // Windows: this is %APPDATA% (Roaming)
  const base = app.getPath('appData');
  return path.join(base, 'StockManagement');
}

function getBackendEntry() {
  // In dev (repo): desktop/ is sibling of backend/
  const dev = path.join(__dirname, '..', 'backend', 'dist', 'main.js');
  if (fs.existsSync(dev)) return dev;

  // In packaged app, backend is expected to be bundled next to this file
  const prod = path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  return prod;
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

  await win.loadURL(`http://127.0.0.1:${port}/`);
  win.show();
}

function startBackend({ port, appDataDir, frontendDistDir }) {
  fs.mkdirSync(appDataDir, { recursive: true });

  const entry = getBackendEntry();
  backendProcess = spawn(process.execPath, [entry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      CORS_ORIGIN: `http://127.0.0.1:${port}`,
      APP_DATA_DIR: appDataDir,
      // Local bundle flags (backend derives LOCAL_MEDIA_DIR and (later) DATABASE_URL from APP_DATA_DIR)
      LOCAL_BUNDLE: 'true',
      DB_PROVIDER: 'sqlite',
      MEDIA_STORAGE: 'local',
      SERVE_FRONTEND_DIR: frontendDistDir
    }
  });

  backendProcess.on('exit', (code) => {
    backendProcess = null;
    if (code !== 0) app.quit();
  });
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

app.whenReady().then(async () => {
  const port = Number(process.env.LOCAL_PORT || 3100);
  const appDataDir = getAppDataDir();

  // In dev (repo): desktop/ is sibling of frontend/
  const devFrontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const frontendDistDir = fs.existsSync(devFrontendDist)
    ? devFrontendDist
    : path.join(process.resourcesPath, 'frontend', 'dist');

  startBackend({ port, appDataDir, frontendDistDir });

  const ok = await waitForHealth(`http://127.0.0.1:${port}/api/health`, 45000);
  if (!ok) {
    app.quit();
    return;
  }

  await createWindow(port);
});
