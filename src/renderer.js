// Any Reset - Renderer Script (White Background, Black Text, Yellow Buttons, No Emojis)

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  const btnRelaunchAdmin = document.getElementById('btn-relaunch-admin');

  const headerVersion = document.getElementById('header-version');
  const toolsVersion = document.getElementById('tools-version');
  const btnCheckUpdateHeader = document.getElementById('btn-check-update-header');
  const btnCheckUpdateTools = document.getElementById('btn-check-update-tools');

  const currentIdVal = document.getElementById('current-id-val');
  const btnCopyId = document.getElementById('btn-copy-id');
  const serviceDot = document.getElementById('service-dot');
  const serviceStatusVal = document.getElementById('service-status-val');
  const btnToggleService = document.getElementById('btn-toggle-service');
  const processStatusVal = document.getElementById('process-status-val');
  const btnKillProc = document.getElementById('btn-kill-proc');
  const btnLaunchAnydesk = document.getElementById('btn-launch-anydesk');

  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  const btnScan = document.getElementById('btn-scan');
  const btnQuickClean = document.getElementById('btn-quick-clean');
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  const chkAutoBackup = document.getElementById('chk-auto-backup');
  const scannedList = document.getElementById('scanned-list');

  const statFilesCount = document.getElementById('stat-files-count');
  const statTotalSize = document.getElementById('stat-total-size');
  const statSelectedCount = document.getElementById('stat-selected-count');
  const statSelectedSize = document.getElementById('stat-selected-size');

  const selectAllBtn = document.getElementById('select-all-btn');
  const selectCacheBtn = document.getElementById('select-cache-btn');
  const selectHistoryBtn = document.getElementById('select-history-btn');
  const selectNoneBtn = document.getElementById('select-none-btn');

  // Factory Reset Elements
  const btnTriggerFactoryReset = document.getElementById('btn-trigger-factory-reset');
  const factoryProgressBox = document.getElementById('factory-progress-box');

  // Backups Elements
  const btnRefreshBackups = document.getElementById('btn-refresh-backups');
  const btnOpenBackupsFolder = document.getElementById('btn-open-backups-folder');
  const backupsTbody = document.getElementById('backups-tbody');
  const backupBadgeCount = document.getElementById('backup-badge-count');

  // Tools Elements
  const btnSafeRestart = document.getElementById('btn-safe-restart');
  const btnStartService = document.getElementById('btn-start-service');
  const btnStopService = document.getElementById('btn-stop-service');
  const btnKillAllProcs = document.getElementById('btn-kill-all-procs');
  const folderButtons = document.querySelectorAll('[data-open]');

  // Logs Elements
  const consoleOutput = document.getElementById('console-output');
  const btnCopyLogs = document.getElementById('btn-copy-logs');
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const logCountText = document.getElementById('log-count-text');

  // Footer Elements
  const footerStatus = document.getElementById('footer-status');

  // Confirmation Modal Elements
  const confirmModal = document.getElementById('confirm-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBodyText = document.getElementById('modal-body-text');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');
  const btnModalClose = document.getElementById('btn-modal-close');

  // Update Modal Elements
  const updateModal = document.getElementById('update-modal');
  const updateModalTitle = document.getElementById('update-modal-title');
  const updateModalBody = document.getElementById('update-modal-body');
  const btnUpdateClose = document.getElementById('btn-update-close');
  const btnUpdateAction = document.getElementById('btn-update-action');
  const btnUpdateModalClose = document.getElementById('btn-update-modal-close');

  // State
  let currentScannedItems = [];
  let selectedItemIds = new Set();
  let logEventsCount = 1;
  let modalResolver = null;
  let pendingUpdateData = null;
  let downloadedUpdatePath = null;

  // Window Controls
  btnMinimize.addEventListener('click', () => window.api.minimizeWindow());
  btnMaximize.addEventListener('click', () => window.api.maximizeWindow());
  btnClose.addEventListener('click', () => window.api.closeWindow());

  // Log Message Receiver
  window.api.onLog((entry) => {
    appendLog(entry.level, `[${entry.timestamp}] ${entry.message}`);
  });

  function appendLog(level, text) {
    const row = document.createElement('div');
    row.className = `log-line log-${level}`;
    row.textContent = text;
    consoleOutput.appendChild(row);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    logEventsCount++;
    logCountText.textContent = `${logEventsCount} events recorded`;
  }

  // Copy AnyDesk ID
  btnCopyId.addEventListener('click', () => {
    const rawText = currentIdVal.textContent.replace(/\s+/g, '');
    if (rawText && rawText !== 'Detecting...' && rawText !== 'None' && rawText !== 'Not Detected') {
      navigator.clipboard.writeText(rawText);
      const original = currentIdVal.textContent;
      currentIdVal.textContent = 'COPIED!';
      setTimeout(() => {
        currentIdVal.textContent = original;
      }, 1200);
    }
  });

  // Modal Helper
  function showConfirm(title, message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
      modalTitle.textContent = title;
      modalBodyText.innerHTML = message;
      btnModalConfirm.textContent = confirmText;
      confirmModal.classList.remove('hidden');
      modalResolver = resolve;
    });
  }

  function closeModal(result) {
    confirmModal.classList.add('hidden');
    if (modalResolver) {
      modalResolver(result);
      modalResolver = null;
    }
  }

  btnModalCancel.addEventListener('click', () => closeModal(false));
  btnModalClose.addEventListener('click', () => closeModal(false));
  btnModalConfirm.addEventListener('click', () => closeModal(true));

  // Tab Switching
  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      navTabs.forEach((t) => t.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');

      if (targetTab === 'tab-backups') {
        loadBackups();
      }
    });
  });

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Update Status Telemetry
  async function refreshStatus() {
    try {
      footerStatus.textContent = 'Updating system status...';
      const status = await window.api.getStatus();

      // Version display
      if (status.appVersion) {
        headerVersion.textContent = `v${status.appVersion}`;
        if (toolsVersion) toolsVersion.textContent = `v${status.appVersion}`;
      }

      // Admin button display
      if (status.isAdmin) {
        btnRelaunchAdmin.classList.add('hidden');
      } else {
        btnRelaunchAdmin.classList.remove('hidden');
      }

      // AnyDesk ID
      if (status.anydeskId) {
        const idStr = String(status.anydeskId);
        const formatted = idStr.replace(/(\d{3})(?=\d)/g, '$1 ');
        currentIdVal.textContent = formatted;
      } else {
        currentIdVal.textContent = 'Not Configured';
      }

      // Service status
      const svc = status.serviceStatus;
      serviceStatusVal.textContent = svc;
      if (svc === 'Running') {
        serviceDot.className = 'status-dot active';
        btnToggleService.textContent = 'Restart';
      } else if (svc === 'Stopped') {
        serviceDot.className = 'status-dot';
        btnToggleService.textContent = 'Start';
      } else {
        serviceDot.className = 'status-dot';
        btnToggleService.textContent = 'Service N/A';
      }

      // Process count
      processStatusVal.textContent = `${status.processCount} Active`;

      footerStatus.textContent = 'Ready';
    } catch (err) {
      footerStatus.textContent = 'Status check error';
      appendLog('error', `Status error: ${err.message}`);
    }
  }

  btnRelaunchAdmin.addEventListener('click', () => {
    window.api.relaunchAsAdmin();
  });

  btnToggleService.addEventListener('click', async () => {
    footerStatus.textContent = 'Managing service...';
    await window.api.safeRestartService();
    await refreshStatus();
  });

  btnKillProc.addEventListener('click', async () => {
    footerStatus.textContent = 'Killing AnyDesk processes...';
    await window.api.killProcesses();
    await refreshStatus();
  });

  btnLaunchAnydesk.addEventListener('click', async () => {
    const res = await window.api.launchAnyDesk();
    if (!res.success) {
      await showConfirm('Launch AnyDesk', `<p>Could not locate AnyDesk executable automatically.</p><p class="text-muted">You can open its directory from the Folders tab.</p>`, 'OK');
    }
  });

  // Scanner Logic
  btnScan.addEventListener('click', async () => {
    await performScan();
  });

  async function performScan() {
    btnScan.disabled = true;
    footerStatus.textContent = 'Scanning AnyDesk directories and registry...';
    scannedList.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        <h3>Scanning in progress...</h3>
        <p>Analyzing local caches, logs, temp data, and configurations...</p>
      </div>
    `;

    try {
      const scan = await window.api.scanAll();
      currentScannedItems = scan.items;

      statFilesCount.textContent = scan.totalFiles;
      statTotalSize.textContent = formatBytes(scan.totalBytes);

      selectedItemIds.clear();
      currentScannedItems.forEach((i) => {
        if (i.defaultChecked && i.exists) {
          selectedItemIds.add(i.id);
        }
      });

      renderScannedItems();
      updateSelectedStats();
      await refreshStatus();
    } catch (e) {
      appendLog('error', `Scan error: ${e.message}`);
    } finally {
      btnScan.disabled = false;
      footerStatus.textContent = 'Ready';
    }
  }

  function renderScannedItems() {
    if (!currentScannedItems || currentScannedItems.length === 0) {
      scannedList.innerHTML = `<div class="empty-state"><h3>No items found</h3></div>`;
      return;
    }

    const categories = [
      { key: 'cache_temp', title: 'CACHE & TEMPORARY FILES', desc: 'Can be safely cleaned anytime' },
      { key: 'traces_logs', title: 'TRACES & DIAGNOSTIC LOGS', desc: 'Session diagnostics and connection history' },
      { key: 'user_history', title: 'USER DATA & SESSION HISTORY', desc: 'Saved favorites, address book, and chats' },
      { key: 'identity_reset', title: 'IDENTITY & REGISTRATION (ANYDESK ID)', desc: 'Erasing these generates a brand-new AnyDesk ID' },
      { key: 'registry', title: 'WINDOWS REGISTRY CONFIGURATION', desc: 'Registry traces under Current User' }
    ];

    let html = '';

    categories.forEach((cat) => {
      const itemsInCat = currentScannedItems.filter((i) => i.category === cat.key);
      if (itemsInCat.length === 0) return;

      const groupBytes = itemsInCat.reduce((sum, item) => sum + (item.exists ? item.sizeBytes : 0), 0);
      const groupCount = itemsInCat.reduce((sum, item) => sum + (item.exists ? item.fileCount : 0), 0);

      html += `
        <div class="scanned-group">
          <div class="scanned-group-header">
            <div class="group-title">
              <span>${cat.title}</span>
            </div>
            <div class="group-stats">
              ${groupCount} item(s) - ${formatBytes(groupBytes)}
            </div>
          </div>
          <div class="scanned-items-list">
      `;

      itemsInCat.forEach((item) => {
        const isChecked = selectedItemIds.has(item.id) ? 'checked' : '';
        const existsTag = item.exists
          ? `<span class="item-size">${formatBytes(item.sizeBytes)}</span><span class="item-count">${item.fileCount} file(s)</span>`
          : `<span class="item-count text-muted">Clean / Not Present</span>`;

        const dangerBadge =
          item.dangerLevel === 'high'
            ? `<span class="badge-danger-high">RESETS ID</span>`
            : item.dangerLevel === 'moderate'
            ? `<span class="badge-danger-safe">USER DATA</span>`
            : `<span class="badge-danger-safe">SAFE CLEAN</span>`;

        html += `
          <div class="scanned-item-row" data-id="${item.id}">
            <div class="item-left">
              <label class="checkbox-container">
                <input type="checkbox" class="item-chk" data-id="${item.id}" ${isChecked} ${item.exists ? '' : 'disabled'}>
                <span class="checkmark"></span>
              </label>
              <div class="item-info">
                <div class="item-name-row">
                  <span class="item-name">${item.name}</span>
                  ${dangerBadge}
                </div>
                <span class="item-desc">${item.description}</span>
                <span class="item-path">${item.path}</span>
              </div>
            </div>
            <div class="item-right">
              <div class="item-metrics">
                ${existsTag}
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    scannedList.innerHTML = html;

    document.querySelectorAll('.item-chk').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          selectedItemIds.add(id);
        } else {
          selectedItemIds.delete(id);
        }
        updateSelectedStats();
      });
    });
  }

  function updateSelectedStats() {
    let selBytes = 0;
    let selCount = 0;

    currentScannedItems.forEach((i) => {
      if (selectedItemIds.has(i.id) && i.exists) {
        selBytes += i.sizeBytes;
        selCount += i.fileCount || 1;
      }
    });

    statSelectedCount.textContent = selectedItemIds.size;
    statSelectedSize.textContent = formatBytes(selBytes);

    btnDeleteSelected.disabled = selectedItemIds.size === 0;
  }

  // Preset Filters
  selectAllBtn.addEventListener('click', () => {
    setActiveChip(selectAllBtn);
    currentScannedItems.forEach((i) => {
      if (i.exists) selectedItemIds.add(i.id);
    });
    renderScannedItems();
    updateSelectedStats();
  });

  selectCacheBtn.addEventListener('click', () => {
    setActiveChip(selectCacheBtn);
    selectedItemIds.clear();
    currentScannedItems.forEach((i) => {
      if ((i.category === 'cache_temp' || i.category === 'traces_logs') && i.exists) {
        selectedItemIds.add(i.id);
      }
    });
    renderScannedItems();
    updateSelectedStats();
  });

  selectHistoryBtn.addEventListener('click', () => {
    setActiveChip(selectHistoryBtn);
    selectedItemIds.clear();
    currentScannedItems.forEach((i) => {
      if (i.category === 'user_history' && i.exists) {
        selectedItemIds.add(i.id);
      }
    });
    renderScannedItems();
    updateSelectedStats();
  });

  selectNoneBtn.addEventListener('click', () => {
    setActiveChip(selectNoneBtn);
    selectedItemIds.clear();
    renderScannedItems();
    updateSelectedStats();
  });

  function setActiveChip(activeBtn) {
    [selectAllBtn, selectCacheBtn, selectHistoryBtn, selectNoneBtn].forEach((b) => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  // Clean Selected
  btnDeleteSelected.addEventListener('click', async () => {
    if (selectedItemIds.size === 0) return;

    const hasIdentity = currentScannedItems.some(
      (i) => selectedItemIds.has(i.id) && i.category === 'identity_reset'
    );

    let warningHtml = `<p>You are about to delete <strong>${selectedItemIds.size} selected item(s)</strong>.</p>`;
    if (hasIdentity) {
      warningHtml += `<p style="margin-top:10px; color:#b91c1c; background:#fee2e2; padding:8px; border:1px solid #ef4444; border-radius:4px;">
        <strong>Warning:</strong> Identity files are selected. This will erase your current AnyDesk ID and generate a new one!
      </p>`;
    }
    if (chkAutoBackup.checked) {
      warningHtml += `<p style="margin-top:10px; font-size:11px; color:#64748b;">Notice: An automatic backup will be created before cleaning.</p>`;
    }

    const confirmed = await showConfirm('Confirm Cleanup', warningHtml, 'Delete Selected');
    if (!confirmed) return;

    footerStatus.textContent = 'Cleaning selected files...';
    btnDeleteSelected.disabled = true;

    try {
      const res = await window.api.cleanItems(Array.from(selectedItemIds), chkAutoBackup.checked);
      appendLog('success', `Clean complete. Removed ${res.deletedCount} files (${formatBytes(res.deletedBytes)}).`);
      await performScan();
      await loadBackups();
    } catch (e) {
      appendLog('error', `Clean error: ${e.message}`);
    } finally {
      footerStatus.textContent = 'Ready';
    }
  });

  // Quick Cache Clean
  btnQuickClean.addEventListener('click', async () => {
    const confirmed = await showConfirm(
      'Quick Cache Clean',
      `<p>This will safely purge all AnyDesk cache folders, thumbnails, and temp files without altering your AnyDesk ID or user settings.</p>`,
      'Clean Cache Now'
    );
    if (!confirmed) return;

    footerStatus.textContent = 'Purging cache & temp files...';
    try {
      const scan = await window.api.scanAll();
      const cacheIds = scan.items
        .filter((i) => (i.category === 'cache_temp' || i.category === 'traces_logs') && i.exists)
        .map((i) => i.id);

      await window.api.cleanItems(cacheIds, chkAutoBackup.checked);
      await performScan();
      await loadBackups();
    } catch (e) {
      appendLog('error', `Quick clean error: ${e.message}`);
    } finally {
      footerStatus.textContent = 'Ready';
    }
  });

  // FACTORY RESET (NEW INSTALL)
  btnTriggerFactoryReset.addEventListener('click', async () => {
    const confirmed = await showConfirm(
      'Factory Reset AnyDesk',
      `<p>This will reset AnyDesk completely to its <strong>out-of-the-box factory state</strong>.</p>
       <ul style="margin:10px 0 10px 20px; font-size:12px; color:#1e293b;">
         <li>Generates a brand new AnyDesk ID</li>
         <li>Clears all connection histories and chats</li>
         <li>Wipes all cache and traces</li>
         <li>Automatic full backup will be preserved</li>
       </ul>
       <p style="font-size:11px; color:#64748b;">You can restore your previous state anytime from the Backups tab.</p>`,
      'Reset to Default Now'
    );

    if (!confirmed) return;

    btnTriggerFactoryReset.disabled = true;
    factoryProgressBox.classList.remove('hidden');
    footerStatus.textContent = 'Executing Factory Reset...';

    const steps = [
      document.getElementById('step-backup'),
      document.getElementById('step-kill'),
      document.getElementById('step-stop-svc'),
      document.getElementById('step-wipe'),
      document.getElementById('step-reg'),
      document.getElementById('step-start-svc')
    ];

    steps.forEach((s) => (s.className = 'progress-step'));

    function markStepActive(idx) {
      steps.forEach((s, i) => {
        if (i < idx) s.className = 'progress-step step-done';
        else if (i === idx) s.className = 'progress-step step-active';
        else s.className = 'progress-step';
      });
    }

    try {
      markStepActive(0);
      await new Promise((r) => setTimeout(r, 400));
      markStepActive(1);
      await new Promise((r) => setTimeout(r, 400));
      markStepActive(2);
      await new Promise((r) => setTimeout(r, 400));
      markStepActive(3);

      const result = await window.api.factoryReset();

      markStepActive(4);
      await new Promise((r) => setTimeout(r, 300));
      markStepActive(5);
      await new Promise((r) => setTimeout(r, 600));

      steps.forEach((s) => (s.className = 'progress-step step-done'));

      await refreshStatus();
      await loadBackups();

      await showConfirm(
        'Factory Reset Complete',
        `<p>AnyDesk has been completely reset to default state.</p>
         <p style="margin-top:10px;"><strong>Assigned New ID:</strong> ${result.newId}</p>
         <p style="margin-top:6px; font-size:11px; color:#64748b;">Your prior settings were backed up to: <code>${result.backupFolder}</code></p>`,
        'OK'
      );
    } catch (e) {
      appendLog('error', `Factory reset error: ${e.message}`);
    } finally {
      btnTriggerFactoryReset.disabled = false;
      footerStatus.textContent = 'Ready';
    }
  });

  // BACKUPS TAB
  async function loadBackups() {
    try {
      const backups = await window.api.listBackups();
      backupBadgeCount.textContent = backups.length;

      if (!backups || backups.length === 0) {
        backupsTbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-8 text-muted">No backups found yet. Clean or reset to generate automatic snapshots.</td>
          </tr>
        `;
        return;
      }

      let html = '';
      backups.forEach((b) => {
        const dateStr = new Date(b.created).toLocaleString();
        html += `
          <tr>
            <td>
              <div style="font-weight:700; color:#000000;">${b.folderName}</div>
              <div style="font-size:10px; color:#64748b;">${dateStr}</div>
            </td>
            <td><span class="badge-danger-safe">${b.label || 'Snapshot'}</span></td>
            <td><code style="font-family:var(--font-mono); font-size:11px; font-weight:700;">${b.originalId}</code></td>
            <td>${b.fileCount || 0}</td>
            <td>${formatBytes(b.totalBytes)}</td>
            <td class="text-right">
              <div class="table-actions">
                <button class="btn btn-sm btn-restore" data-folder="${b.folderName}">Restore</button>
                <button class="btn btn-sm btn-outline btn-del-backup" data-folder="${b.folderName}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      });

      backupsTbody.innerHTML = html;

      document.querySelectorAll('.btn-restore').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const folder = e.target.getAttribute('data-folder');
          const confirmed = await showConfirm(
            'Restore Backup',
            `<p>Restore AnyDesk to the state from <strong>${folder}</strong>?</p>
             <p style="margin-top:8px; font-size:11px; color:#64748b;">This will replace your current AnyDesk configurations and restore the backed-up ID.</p>`,
            'Restore Now'
          );
          if (!confirmed) return;

          footerStatus.textContent = 'Restoring backup...';
          const res = await window.api.restoreBackup(folder);
          if (res.success) {
            await refreshStatus();
            await showConfirm('Backup Restored', `<p>AnyDesk configuration restored successfully.</p><p>Active ID: <strong>${res.restoredId || 'Restored'}</strong></p>`, 'OK');
          } else {
            appendLog('error', `Restore error: ${res.error}`);
          }
          footerStatus.textContent = 'Ready';
        });
      });

      document.querySelectorAll('.btn-del-backup').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const folder = e.target.getAttribute('data-folder');
          const confirmed = await showConfirm('Delete Backup', `<p>Delete backup <strong>${folder}</strong> permanently?</p>`, 'Delete');
          if (!confirmed) return;
          await window.api.deleteBackup(folder);
          await loadBackups();
        });
      });
    } catch (e) {
      appendLog('error', `Load backups error: ${e.message}`);
    }
  }

  btnRefreshBackups.addEventListener('click', loadBackups);
  btnOpenBackupsFolder.addEventListener('click', () => window.api.openFolder('backups'));

  // TOOLS TAB
  btnSafeRestart.addEventListener('click', async () => {
    footerStatus.textContent = 'Performing safe restart...';
    await window.api.safeRestartService();
    await refreshStatus();
  });

  btnStartService.addEventListener('click', async () => {
    footerStatus.textContent = 'Starting service...';
    await window.api.startService();
    await refreshStatus();
  });

  btnStopService.addEventListener('click', async () => {
    footerStatus.textContent = 'Stopping service...';
    await window.api.stopService();
    await refreshStatus();
  });

  btnKillAllProcs.addEventListener('click', async () => {
    footerStatus.textContent = 'Terminating tasks...';
    await window.api.killProcesses();
    await refreshStatus();
  });

  folderButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-open');
      window.api.openFolder(target);
    });
  });

  // LOGS TAB
  btnCopyLogs.addEventListener('click', () => {
    const text = consoleOutput.innerText;
    navigator.clipboard.writeText(text);
    btnCopyLogs.textContent = 'Copied!';
    setTimeout(() => (btnCopyLogs.textContent = 'Copy Log'), 1500);
  });

  btnClearLogs.addEventListener('click', () => {
    consoleOutput.innerHTML = '';
    logEventsCount = 0;
    logCountText.textContent = '0 events recorded';
  });

  // ==========================================
  // AUTO-UPDATE SYSTEM UI
  // ==========================================

  async function handleCheckForUpdates() {
    footerStatus.textContent = 'Checking GitHub releases for updates...';
    appendLog('info', 'Contacting GitHub API for latest release...');

    updateModalTitle.textContent = 'Checking for Updates...';
    updateModalBody.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        <p style="margin-top:12px; font-weight:700;">Querying repository releases...</p>
      </div>
    `;
    btnUpdateAction.classList.add('hidden');
    btnUpdateClose.textContent = 'Cancel';
    updateModal.classList.remove('hidden');

    try {
      const res = await window.api.checkForUpdates();
      if (!res.success) {
        updateModalTitle.textContent = 'Update Check Failed';
        updateModalBody.innerHTML = `<p style="color:#b91c1c;">Could not check for updates: ${res.error}</p>`;
        btnUpdateClose.textContent = 'Close';
        return;
      }

      if (res.hasUpdate) {
        pendingUpdateData = res;
        updateModalTitle.textContent = `New Update Available: ${res.latestVersion}`;
        updateModalBody.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="background:var(--btn-yellow-faint); padding:10px; border:1px solid var(--border-dark); border-radius:4px;">
              <div><strong>Current Version:</strong> ${res.currentVersion}</div>
              <div><strong>Latest Version:</strong> ${res.latestVersion}</div>
              ${res.asset ? `<div><strong>Download Size:</strong> ${formatBytes(res.asset.size)}</div>` : ''}
            </div>
            <div>
              <div style="font-weight:700; margin-bottom:4px;">Release Notes:</div>
              <pre style="background:var(--bg-secondary); padding:8px; border:1px solid var(--border-color); border-radius:4px; font-size:11px; max-height:140px; overflow-y:auto; white-space:pre-wrap;">${res.releaseNotes}</pre>
            </div>
            <div id="update-progress-area" class="update-progress-container hidden">
              <div class="update-meta-row">
                <span id="update-progress-label">Downloading update...</span>
                <span id="update-progress-percent">0%</span>
              </div>
              <div class="update-progress-bar-bg">
                <div id="update-progress-fill" class="update-progress-bar-fill"></div>
              </div>
            </div>
          </div>
        `;
        btnUpdateAction.textContent = 'Download Update Now';
        btnUpdateAction.classList.remove('hidden');
        btnUpdateClose.textContent = 'Later';
      } else {
        updateModalTitle.textContent = 'You are Up to Date';
        updateModalBody.innerHTML = `
          <div style="text-align:center; padding:16px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            <h4 style="margin-top:10px; font-weight:800;">Any Reset is up to date</h4>
            <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Installed Version: <strong>${res.currentVersion}</strong> (Latest on GitHub)</p>
          </div>
        `;
        btnUpdateAction.classList.add('hidden');
        btnUpdateClose.textContent = 'OK';
      }
    } catch (e) {
      updateModalTitle.textContent = 'Error';
      updateModalBody.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
      btnUpdateAction.classList.add('hidden');
      btnUpdateClose.textContent = 'Close';
    } finally {
      footerStatus.textContent = 'Ready';
    }
  }

  btnCheckUpdateHeader.addEventListener('click', handleCheckForUpdates);
  btnCheckUpdateTools.addEventListener('click', handleCheckForUpdates);

  btnUpdateClose.addEventListener('click', () => {
    updateModal.classList.add('hidden');
  });

  btnUpdateModalClose.addEventListener('click', () => {
    updateModal.classList.add('hidden');
  });

  // Handle Download Action
  btnUpdateAction.addEventListener('click', async () => {
    if (downloadedUpdatePath) {
      window.api.runDownloadedUpdate(downloadedUpdatePath);
      return;
    }

    if (!pendingUpdateData || !pendingUpdateData.asset) {
      return;
    }

    const { downloadUrl, name } = pendingUpdateData.asset;
    const progressArea = document.getElementById('update-progress-area');
    const progressFill = document.getElementById('update-progress-fill');
    const progressPercent = document.getElementById('update-progress-percent');
    const progressLabel = document.getElementById('update-progress-label');

    if (progressArea) progressArea.classList.remove('hidden');
    btnUpdateAction.disabled = true;
    btnUpdateAction.textContent = 'Downloading...';

    window.api.onUpdateProgress((p) => {
      if (progressFill) progressFill.style.width = `${p.percent}%`;
      if (progressPercent) progressPercent.textContent = `${p.percent}%`;
      if (progressLabel) progressLabel.textContent = `Downloaded ${formatBytes(p.receivedBytes)} of ${formatBytes(p.totalBytes)}`;
    });

    try {
      const result = await window.api.downloadUpdate(downloadUrl, name);
      if (result.success) {
        downloadedUpdatePath = result.filePath;
        if (progressLabel) progressLabel.textContent = 'Download Complete!';
        btnUpdateAction.disabled = false;
        btnUpdateAction.textContent = 'Launch Update & Restart';
        btnUpdateClose.textContent = 'Close';
      } else {
        if (progressLabel) progressLabel.textContent = 'Download failed.';
        btnUpdateAction.disabled = false;
        btnUpdateAction.textContent = 'Retry Download';
      }
    } catch (e) {
      appendLog('error', `Download error: ${e.message}`);
      btnUpdateAction.disabled = false;
      btnUpdateAction.textContent = 'Retry Download';
    }
  });

  // Initial Load
  refreshStatus();
  loadBackups();
  performScan();
});
