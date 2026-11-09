const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Status & Environment
  getStatus: () => ipcRenderer.invoke('get-status'),
  relaunchAsAdmin: () => ipcRenderer.invoke('relaunch-as-admin'),
  launchAnyDesk: () => ipcRenderer.invoke('launch-anydesk'),

  // Scanning & Cleaning
  scanAll: () => ipcRenderer.invoke('scan-all'),
  cleanItems: (itemIds, shouldBackup) => ipcRenderer.invoke('clean-items', { itemIds, shouldBackup }),
  factoryReset: () => ipcRenderer.invoke('factory-reset'),

  // Services & Processes
  safeRestartService: () => ipcRenderer.invoke('safe-restart-service'),
  killProcesses: () => ipcRenderer.invoke('kill-processes'),
  startService: () => ipcRenderer.invoke('start-service'),
  stopService: () => ipcRenderer.invoke('stop-service'),

  // Folder & Backup Management
  openFolder: (target) => ipcRenderer.invoke('open-folder', target),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (folderName) => ipcRenderer.invoke('restore-backup', folderName),
  deleteBackup: (folderName) => ipcRenderer.invoke('delete-backup', folderName),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // Event Listeners
  onLog: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('log-message', handler);
    return () => ipcRenderer.removeListener('log-message', handler);
  },
  onStatusUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('status-update', handler);
    return () => ipcRenderer.removeListener('status-update', handler);
  }
});
