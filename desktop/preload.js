const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_event, value) => callback(value))
});
