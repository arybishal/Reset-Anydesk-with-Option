const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');

let mainWindow = null;

// Target Paths
const PATHS = {
  PROGRAM_DATA: path.join(process.env.ProgramData || 'C:\\ProgramData', 'AnyDesk'),
  APPDATA_ROAMING: path.join(process.env.APPDATA || '', 'AnyDesk'),
  APPDATA_LOCAL: path.join(process.env.LOCALAPPDATA || '', 'AnyDesk'),
  TEMP: path.join(process.env.TEMP || '', 'AnyDesk'),
  BACKUP_DIR: path.join(process.env.USERPROFILE || 'C:\\', 'AnyReset-Backups')
};

function sendLog(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { timestamp, level, message };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', entry);
  }
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

function checkAdmin() {
  try {
    execSync('fltmc', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stdout, stderr });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
}

function getDirectorySizeAndCount(dirPath) {
  let totalBytes = 0;
  let fileCount = 0;

  function traverse(current) {
    try {
      if (!fs.existsSync(current)) return;
      const stats = fs.statSync(current);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(current);
        for (const file of files) {
          traverse(path.join(current, file));
        }
      } else {
        totalBytes += stats.size;
        fileCount += 1;
      }
    } catch (e) {
      // Permission or locked file
    }
  }

  traverse(dirPath);
  return { totalBytes, fileCount };
}

function getFileSize(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      return { totalBytes: stat.size, fileCount: 1, exists: true };
    }
  } catch (e) {}
  return { totalBytes: 0, fileCount: 0, exists: false };
}

async function getAnyDeskProcesses() {
  const result = await execPromise(
    'powershell -NoProfile -Command "Get-Process -Name AnyDesk -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"'
  );
  if (!result.success || !result.stdout) {
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isNaN(Number(s)))
    .map(Number);
}

async function getAnyDeskServiceStatus() {
  const result = await execPromise(
    'powershell -NoProfile -Command "$s = Get-Service -Name AnyDesk -ErrorAction SilentlyContinue; if ($s) { $s.Status.ToString() } else { \'NotInstalled\' }"'
  );
  if (!result.success || !result.stdout) {
    return 'Unknown';
  }
  const status = result.stdout.trim();
  return status || 'NotInstalled';
}

function getAnyDeskId() {
  const potentialFiles = [
    path.join(PATHS.PROGRAM_DATA, 'system.conf'),
    path.join(PATHS.APPDATA_ROAMING, 'system.conf'),
    path.join(PATHS.PROGRAM_DATA, 'service.conf'),
    path.join(PATHS.APPDATA_ROAMING, 'user.conf')
  ];

  for (const filePath of potentialFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/ad\.anynet\.id\s*=\s*(\d+)/i);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {}
  }
  return null;
}

function findAnyDeskExecutable() {
  const candidates = [
    'C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe',
    'C:\\Program Files\\AnyDesk\\AnyDesk.exe',
    path.join(process.env.LOCALAPPDATA || '', 'AnyDesk', 'AnyDesk.exe'),
    path.join(process.env.APPDATA || '', 'AnyDesk', 'AnyDesk.exe')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function getStatus() {
  const isAdmin = checkAdmin();
  const pids = await getAnyDeskProcesses();
  const serviceStatus = await getAnyDeskServiceStatus();
  const anydeskId = getAnyDeskId();
  const exePath = findAnyDeskExecutable();

  return {
    isAdmin,
    processCount: pids.length,
    pids,
    serviceStatus,
    anydeskId,
    exePath,
    installed: !!exePath,
    paths: PATHS
  };
}

async function scanAllItems() {
  sendLog('info', 'Starting comprehensive scan of AnyDesk data, cache, and configuration...');

  const items = [
    // --- CACHE & TEMP ---
    {
      id: 'local_cache',
      category: 'cache_temp',
      categoryLabel: 'Cache & Temporary Data',
      name: 'Local Session Cache',
      path: path.join(PATHS.APPDATA_LOCAL, 'cache'),
      type: 'directory',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Render caches, streaming session chunks, and display buffers.'
    },
    {
      id: 'roaming_cache',
      category: 'cache_temp',
      categoryLabel: 'Cache & Temporary Data',
      name: 'Roaming User Cache',
      path: path.join(PATHS.APPDATA_ROAMING, 'cache'),
      type: 'directory',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Temporary files cached in roaming profile.'
    },
    {
      id: 'progdata_cache',
      category: 'cache_temp',
      categoryLabel: 'Cache & Temporary Data',
      name: 'System Service Cache',
      path: path.join(PATHS.PROGRAM_DATA, 'cache'),
      type: 'directory',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'System-level AnyDesk cache files.'
    },
    {
      id: 'temp_folder',
      category: 'cache_temp',
      categoryLabel: 'Cache & Temporary Data',
      name: 'Windows Temp Storage',
      path: PATHS.TEMP,
      type: 'directory',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Unpacked runtime executables and clipboard exchange data.'
    },
    {
      id: 'roaming_thumbnails',
      category: 'cache_temp',
      categoryLabel: 'Cache & Temporary Data',
      name: 'Remote Desktop Thumbnails',
      path: path.join(PATHS.APPDATA_ROAMING, 'thumbnails'),
      type: 'directory',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Screen preview snapshots of remote computers from speed-dial.'
    },
    {
      id: 'local_thumbnails',
      category: 'cache_temp',
      categoryLabel: 'Cache & Temporary Data',
      name: 'Local Preview Thumbnails',
      path: path.join(PATHS.APPDATA_LOCAL, 'thumbnails'),
      type: 'directory',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Locally cached thumbnail images.'
    },

    // --- TRACES & LOGS ---
    {
      id: 'user_trace',
      category: 'traces_logs',
      categoryLabel: 'Traces & Diagnostic Logs',
      name: 'User Client Trace Log (ad.trace)',
      path: path.join(PATHS.APPDATA_ROAMING, 'ad.trace'),
      type: 'file',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Diagnostic logs tracking AnyDesk GUI interactions and network sessions.'
    },
    {
      id: 'user_conn_trace',
      category: 'traces_logs',
      categoryLabel: 'Traces & Diagnostic Logs',
      name: 'User Connection Trace Log',
      path: path.join(PATHS.APPDATA_ROAMING, 'connection_trace.txt'),
      type: 'file',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'History of incoming and outgoing remote connection sessions.'
    },
    {
      id: 'svc_trace',
      category: 'traces_logs',
      categoryLabel: 'Traces & Diagnostic Logs',
      name: 'Service Trace Log (ad_svc.trace)',
      path: path.join(PATHS.PROGRAM_DATA, 'ad_svc.trace'),
      type: 'file',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'Background Windows AnyDesk Service diagnostic and telemetry log.'
    },
    {
      id: 'svc_conn_trace',
      category: 'traces_logs',
      categoryLabel: 'Traces & Diagnostic Logs',
      name: 'Service Connection Trace Log',
      path: path.join(PATHS.PROGRAM_DATA, 'connection_trace.txt'),
      type: 'file',
      dangerLevel: 'safe',
      defaultChecked: true,
      description: 'System service level log of remote client connections.'
    },

    // --- USER DATA & HISTORY ---
    {
      id: 'user_config',
      category: 'user_history',
      categoryLabel: 'User Data & Session History',
      name: 'User Configuration (user.conf)',
      path: path.join(PATHS.APPDATA_ROAMING, 'user.conf'),
      type: 'file',
      dangerLevel: 'moderate',
      defaultChecked: false,
      description: 'Saved speed-dial tiles, address book, recent connections, and UI settings.'
    },
    {
      id: 'chat_history',
      category: 'user_history',
      categoryLabel: 'User Data & Session History',
      name: 'Session Chat Transcripts',
      path: path.join(PATHS.APPDATA_ROAMING, 'chat'),
      type: 'directory',
      dangerLevel: 'moderate',
      defaultChecked: false,
      description: 'Text chat logs exchanged during remote sessions.'
    },

    // --- IDENTITY & REGISTRATION ---
    {
      id: 'system_conf',
      category: 'identity_reset',
      categoryLabel: 'Identity & AnyDesk ID (Reset)',
      name: 'System Identity Configuration (system.conf)',
      path: path.join(PATHS.PROGRAM_DATA, 'system.conf'),
      type: 'file',
      dangerLevel: 'high',
      defaultChecked: false,
      description: 'Contains Hardware Fingerprint and assigned AnyDesk ID. Deleting this resets your ID!'
    },
    {
      id: 'service_conf',
      category: 'identity_reset',
      categoryLabel: 'Identity & AnyDesk ID (Reset)',
      name: 'Service Configuration (service.conf)',
      path: path.join(PATHS.PROGRAM_DATA, 'service.conf'),
      type: 'file',
      dangerLevel: 'high',
      defaultChecked: false,
      description: 'Service authentication certificates, encryption keys, and license binding.'
    },
    {
      id: 'user_system_conf',
      category: 'identity_reset',
      categoryLabel: 'Identity & AnyDesk ID (Reset)',
      name: 'User System Config (system.conf)',
      path: path.join(PATHS.APPDATA_ROAMING, 'system.conf'),
      type: 'file',
      dangerLevel: 'high',
      defaultChecked: false,
      description: 'Client identity file used in standalone or portable AnyDesk installations.'
    },

    // --- REGISTRY ---
    {
      id: 'registry_user',
      category: 'registry',
      categoryLabel: 'Windows Registry Entries',
      name: 'User Registry Key',
      path: 'HKCU\\Software\\AnyDesk',
      type: 'registry',
      dangerLevel: 'moderate',
      defaultChecked: false,
      description: 'Windows Registry settings stored under Current User.'
    }
  ];

  let totalScannedBytes = 0;
  let totalScannedFiles = 0;

  for (const item of items) {
    if (item.type === 'directory') {
      if (fs.existsSync(item.path)) {
        const { totalBytes, fileCount } = getDirectorySizeAndCount(item.path);
        item.exists = true;
        item.sizeBytes = totalBytes;
        item.fileCount = fileCount;
        totalScannedBytes += totalBytes;
        totalScannedFiles += fileCount;
      } else {
        item.exists = false;
        item.sizeBytes = 0;
        item.fileCount = 0;
      }
    } else if (item.type === 'file') {
      const { totalBytes, fileCount, exists } = getFileSize(item.path);
      item.exists = exists;
      item.sizeBytes = totalBytes;
      item.fileCount = fileCount;
      if (exists) {
        totalScannedBytes += totalBytes;
        totalScannedFiles += 1;
      }
    } else if (item.type === 'registry') {
      const regRes = await execPromise(`reg query "${item.path}" 2>nul`);
      item.exists = regRes.success;
      item.sizeBytes = item.exists ? 1024 : 0;
      item.fileCount = item.exists ? 1 : 0;
    }
  }

  sendLog(
    'info',
    `Scan finished. Found ${totalScannedFiles} items totaling ${(totalScannedBytes / 1024 / 1024).toFixed(2)} MB.`
  );

  return {
    items,
    totalBytes: totalScannedBytes,
    totalFiles: totalScannedFiles,
    timestamp: new Date().toISOString()
  };
}

async function createBackup(label = 'Manual') {
  try {
    if (!fs.existsSync(PATHS.BACKUP_DIR)) {
      fs.mkdirSync(PATHS.BACKUP_DIR, { recursive: true });
    }

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const folderName = `Backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours()
    )}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const targetDir = path.join(PATHS.BACKUP_DIR, folderName);

    fs.mkdirSync(targetDir, { recursive: true });

    const currentId = getAnyDeskId();
    sendLog('info', `Creating automatic safety backup in: ${folderName}...`);

    let filesCopied = 0;
    let bytesCopied = 0;

    // Backup ProgramData AnyDesk
    if (fs.existsSync(PATHS.PROGRAM_DATA)) {
      const destSystem = path.join(targetDir, 'System');
      fs.mkdirSync(destSystem, { recursive: true });
      await execPromise(`robocopy "${PATHS.PROGRAM_DATA}" "${destSystem}" /E /COPY:DAT /R:1 /W:1 2>nul`);
    }

    // Backup Roaming AnyDesk
    if (fs.existsSync(PATHS.APPDATA_ROAMING)) {
      const destUser = path.join(targetDir, 'User');
      fs.mkdirSync(destUser, { recursive: true });
      await execPromise(`robocopy "${PATHS.APPDATA_ROAMING}" "${destUser}" /E /COPY:DAT /R:1 /W:1 2>nul`);
    }

    const { totalBytes, fileCount } = getDirectorySizeAndCount(targetDir);
    bytesCopied = totalBytes;
    filesCopied = fileCount;

    const metadata = {
      folderName,
      created: now.toISOString(),
      label,
      originalId: currentId || 'Unknown',
      fileCount: filesCopied,
      totalBytes: bytesCopied
    };

    fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    sendLog(
      'success',
      `Backup completed! Saved ${filesCopied} files (${(bytesCopied / 1024 / 1024).toFixed(2)} MB) with AnyDesk ID: ${
        currentId || 'N/A'
      }`
    );
    return { success: true, folderName, metadata };
  } catch (err) {
    sendLog('error', `Backup failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function stopAnyDeskProcesses() {
  sendLog('info', 'Terminating active AnyDesk processes...');
  const res = await execPromise('taskkill /F /IM AnyDesk.exe /T 2>nul');
  await new Promise((r) => setTimeout(r, 600));
  return res;
}

async function stopAnyDeskService() {
  sendLog('info', 'Stopping AnyDesk Windows service...');
  const res = await execPromise(
    'powershell -NoProfile -Command "try { $s = Get-Service -Name AnyDesk -ErrorAction Stop; if ($s.Status -ne \'Stopped\') { Stop-Service AnyDesk -Force -ErrorAction Stop; $s.WaitForStatus(\'Stopped\', [TimeSpan]::FromSeconds(15)) }; exit 0 } catch { exit 1 }"'
  );
  await new Promise((r) => setTimeout(r, 500));
  return res.success;
}

async function startAnyDeskService() {
  sendLog('info', 'Starting AnyDesk Windows service...');
  const res = await execPromise(
    'powershell -NoProfile -Command "try { $s = Get-Service -Name AnyDesk -ErrorAction Stop; if ($s.Status -ne \'Running\') { Start-Service AnyDesk -ErrorAction Stop; $s.WaitForStatus(\'Running\', [TimeSpan]::FromSeconds(20)) }; exit 0 } catch { exit 1 }"'
  );
  return res.success;
}

async function cleanSpecificItems(itemIds, shouldBackup = true) {
  if (shouldBackup) {
    await createBackup('Pre-Clean Backup');
  }

  // Check if any identity or service files need cleaning; if so, stop service and processes
  await stopAnyDeskProcesses();
  await stopAnyDeskService();

  const scan = await scanAllItems();
  const selectedItems = scan.items.filter((i) => itemIds.includes(i.id) && i.exists);

  let deletedCount = 0;
  let deletedBytes = 0;

  for (const item of selectedItems) {
    try {
      if (item.type === 'registry') {
        sendLog('info', `Removing registry key: ${item.path}...`);
        await execPromise(`reg delete "${item.path}" /f 2>nul`);
        deletedCount += 1;
      } else if (item.type === 'directory') {
        sendLog('info', `Deleting folder: ${item.path}...`);
        if (fs.existsSync(item.path)) {
          fs.rmSync(item.path, { recursive: true, force: true });
          deletedCount += item.fileCount;
          deletedBytes += item.sizeBytes;
        }
      } else if (item.type === 'file') {
        sendLog('info', `Deleting file: ${item.path}...`);
        if (fs.existsSync(item.path)) {
          fs.unlinkSync(item.path);
          deletedCount += 1;
          deletedBytes += item.sizeBytes;
        }
      }
    } catch (err) {
      sendLog('error', `Could not delete ${item.name}: ${err.message}`);
    }
  }

  // If service is installed, attempt to start it
  const serviceStatus = await getAnyDeskServiceStatus();
  if (serviceStatus !== 'NotInstalled') {
    await startAnyDeskService();
  }

  sendLog(
    'success',
    `Clean complete! Removed ${deletedCount} files/entries (${(deletedBytes / 1024 / 1024).toFixed(2)} MB).`
  );

  return {
    success: true,
    deletedCount,
    deletedBytes
  };
}

async function performFactoryReset() {
  sendLog('info', '=======================================================');
  sendLog('info', '🚀 STARTING FULL FACTORY RESET (NEW INSTALL MODE)');
  sendLog('info', '=======================================================');

  // Step 1: Automatic Safety Backup
  sendLog('info', '[Step 1/6] Performing automatic pre-reset backup...');
  const backupRes = await createBackup('Pre-Factory-Reset');
  if (!backupRes.success) {
    sendLog('warn', 'Backup had warnings, but continuing with caution.');
  }

  // Step 2: Stop AnyDesk Processes
  sendLog('info', '[Step 2/6] Closing all active AnyDesk instances...');
  await stopAnyDeskProcesses();

  // Step 3: Stop AnyDesk Service
  sendLog('info', '[Step 3/6] Stopping AnyDesk system service...');
  await stopAnyDeskService();

  // Step 4: Purge Identity, Configurations, Logs, and Caches
  sendLog('info', '[Step 4/6] Wiping all identity tokens, licenses, caches, and history...');

  const targetsToDelete = [
    // Identity Files (Generates Brand New AnyDesk ID on next start!)
    path.join(PATHS.PROGRAM_DATA, 'system.conf'),
    path.join(PATHS.PROGRAM_DATA, 'service.conf'),
    path.join(PATHS.PROGRAM_DATA, 'service.conf.lock'),
    path.join(PATHS.PROGRAM_DATA, 'system.conf.lock'),
    path.join(PATHS.APPDATA_ROAMING, 'system.conf'),
    path.join(PATHS.APPDATA_ROAMING, 'user.conf'),
    path.join(PATHS.APPDATA_ROAMING, 'user.conf.lock'),

    // Caches & Temps
    path.join(PATHS.APPDATA_LOCAL, 'cache'),
    path.join(PATHS.APPDATA_ROAMING, 'cache'),
    path.join(PATHS.PROGRAM_DATA, 'cache'),
    path.join(PATHS.APPDATA_ROAMING, 'thumbnails'),
    path.join(PATHS.APPDATA_LOCAL, 'thumbnails'),
    PATHS.TEMP,

    // Traces & Diagnostic Logs
    path.join(PATHS.APPDATA_ROAMING, 'ad.trace'),
    path.join(PATHS.APPDATA_ROAMING, 'connection_trace.txt'),
    path.join(PATHS.PROGRAM_DATA, 'ad_svc.trace'),
    path.join(PATHS.PROGRAM_DATA, 'connection_trace.txt'),

    // Chat Transcripts
    path.join(PATHS.APPDATA_ROAMING, 'chat')
  ];

  for (const t of targetsToDelete) {
    try {
      if (fs.existsSync(t)) {
        const stat = fs.statSync(t);
        if (stat.isDirectory()) {
          fs.rmSync(t, { recursive: true, force: true });
        } else {
          fs.unlinkSync(t);
        }
      }
    } catch (e) {
      sendLog('warn', `Could not delete ${path.basename(t)}: ${e.message}`);
    }
  }

  // Step 5: Clean Registry Settings
  sendLog('info', '[Step 5/6] Resetting AnyDesk Windows Registry configuration...');
  await execPromise('reg delete "HKCU\\Software\\AnyDesk" /f 2>nul');

  // Step 6: Restart Service (so it creates a brand new ID)
  sendLog('info', '[Step 6/6] Re-initializing service...');
  const serviceStatus = await getAnyDeskServiceStatus();
  if (serviceStatus !== 'NotInstalled') {
    await startAnyDeskService();
    // Allow service 2 seconds to generate fresh ID
    await new Promise((r) => setTimeout(r, 2000));
  }

  const newId = getAnyDeskId();
  sendLog('info', '=======================================================');
  sendLog(
    'success',
    `🎉 FACTORY RESET COMPLETE! AnyDesk is now like newly installed.${newId ? ' New Assigned ID: ' + newId : ''}`
  );
  sendLog('info', '=======================================================');

  return {
    success: true,
    newId: newId || 'Generated on next AnyDesk launch',
    backupFolder: backupRes.folderName
  };
}

async function listBackups() {
  if (!fs.existsSync(PATHS.BACKUP_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(PATHS.BACKUP_DIR);
  const backups = [];

  for (const entry of entries) {
    const fullPath = path.join(PATHS.BACKUP_DIR, entry);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        const metaPath = path.join(fullPath, 'metadata.json');
        let meta = null;
        if (fs.existsSync(metaPath)) {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } else {
          const { totalBytes, fileCount } = getDirectorySizeAndCount(fullPath);
          meta = {
            folderName: entry,
            created: stats.birthtime.toISOString(),
            label: 'Auto Backup',
            originalId: 'Unknown',
            fileCount,
            totalBytes
          };
        }
        backups.push(meta);
      }
    } catch (e) {}
  }

  // Sort descending by created date
  backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  return backups;
}

async function restoreBackup(folderName) {
  const backupPath = path.join(PATHS.BACKUP_DIR, folderName);
  if (!fs.existsSync(backupPath)) {
    return { success: false, error: 'Backup folder not found.' };
  }

  sendLog('info', `Restoring backup from: ${folderName}...`);

  await stopAnyDeskProcesses();
  await stopAnyDeskService();

  const systemSource = path.join(backupPath, 'System');
  const userSource = path.join(backupPath, 'User');

  if (fs.existsSync(systemSource)) {
    fs.mkdirSync(PATHS.PROGRAM_DATA, { recursive: true });
    await execPromise(`robocopy "${systemSource}" "${PATHS.PROGRAM_DATA}" /E /COPY:DAT /R:1 /W:1 2>nul`);
  }

  if (fs.existsSync(userSource)) {
    fs.mkdirSync(PATHS.APPDATA_ROAMING, { recursive: true });
    await execPromise(`robocopy "${userSource}" "${PATHS.APPDATA_ROAMING}" /E /COPY:DAT /R:1 /W:1 2>nul`);
  }

  const serviceStatus = await getAnyDeskServiceStatus();
  if (serviceStatus !== 'NotInstalled') {
    await startAnyDeskService();
  }

  const restoredId = getAnyDeskId();
  sendLog('success', `Backup restored successfully! Active ID: ${restoredId || 'Restored'}`);

  return { success: true, restoredId };
}

async function deleteBackup(folderName) {
  const backupPath = path.join(PATHS.BACKUP_DIR, folderName);
  if (fs.existsSync(backupPath)) {
    fs.rmSync(backupPath, { recursive: true, force: true });
    sendLog('info', `Deleted backup folder: ${folderName}`);
    return { success: true };
  }
  return { success: false, error: 'Folder not found.' };
}

function relaunchAsAdmin() {
  sendLog('info', 'Requesting Administrator elevation...');
  const appPath = app.getPath('exe');
  const args = process.argv.slice(1).map((a) => `"${a}"`).join(' ');
  const cmd = `powershell -NoProfile -Command "Start-Process '${appPath}' -ArgumentList '${args}' -Verb RunAs"`;
  exec(cmd, () => {
    app.quit();
  });
}

// Electron IPC Handlers
ipcMain.handle('get-status', async () => getStatus());
ipcMain.handle('scan-all', async () => scanAllItems());
ipcMain.handle('clean-items', async (_e, { itemIds, shouldBackup }) => cleanSpecificItems(itemIds, shouldBackup));
ipcMain.handle('factory-reset', async () => performFactoryReset());
ipcMain.handle('relaunch-as-admin', () => relaunchAsAdmin());

ipcMain.handle('safe-restart-service', async () => {
  sendLog('info', 'Performing safe service restart...');
  await stopAnyDeskService();
  const ok = await startAnyDeskService();
  sendLog(ok ? 'success' : 'error', ok ? 'Service restarted cleanly.' : 'Service restart encountered errors.');
  return { success: ok };
});

ipcMain.handle('kill-processes', async () => {
  const res = await stopAnyDeskProcesses();
  sendLog('info', 'AnyDesk processes terminated.');
  return { success: res.success };
});

ipcMain.handle('start-service', async () => ({ success: await startAnyDeskService() }));
ipcMain.handle('stop-service', async () => ({ success: await stopAnyDeskService() }));

ipcMain.handle('launch-anydesk', async () => {
  const exe = findAnyDeskExecutable();
  if (exe) {
    sendLog('info', `Launching AnyDesk from: ${exe}`);
    shell.openPath(exe);
    return { success: true, path: exe };
  }
  return { success: false, error: 'AnyDesk executable not found.' };
});

ipcMain.handle('open-folder', async (_e, target) => {
  let targetPath = '';
  switch (target) {
    case 'programdata':
      targetPath = PATHS.PROGRAM_DATA;
      break;
    case 'appdata':
      targetPath = PATHS.APPDATA_ROAMING;
      break;
    case 'localappdata':
      targetPath = PATHS.APPDATA_LOCAL;
      break;
    case 'temp':
      targetPath = PATHS.TEMP;
      break;
    case 'backups':
      targetPath = PATHS.BACKUP_DIR;
      break;
    default:
      targetPath = target;
  }
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  shell.openPath(targetPath);
  return { success: true };
});

ipcMain.handle('list-backups', async () => listBackups());
ipcMain.handle('restore-backup', async (_e, folderName) => restoreBackup(folderName));
ipcMain.handle('delete-backup', async (_e, folderName) => deleteBackup(folderName));

// Window Management
ipcMain.handle('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.handle('window-close', () => mainWindow && mainWindow.close());

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 880,
    minHeight: 640,
    frame: false,
    backgroundColor: '#09090b',
    title: 'Any Reset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
