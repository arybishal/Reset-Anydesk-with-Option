// Any Reset - Renderer Script

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  const adminBadge = document.getElementById('admin-badge');
  const adminText = document.getElementById('admin-text');
  const btnRelaunchAdmin = document.getElementById('btn-relaunch-admin');

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

  // Modal Elements
  const confirmModal = document.getElementById('confirm-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBodyText = document.getElementById('modal-body-text');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');
  const btnModalClose = document.getElementById('btn-modal-close');

  // State
  let currentScannedItems = [];
  let selectedItemIds = new Set();
  let logEventsCount = 1;
  let modalResolver = null;

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

  // Format Bytes helper
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

      // Admin badge
      if (status.isAdmin) {
        adminBadge.className = 'badge badge-elevated';
        adminText.textContent = 'ADMIN ELEVATED';
        btnRelaunchAdmin.classList.add('hidden');
      } else {
        adminBadge.className = 'badge badge-outline';
        adminText.textContent = 'STANDARD USER';
        btnRelaunchAdmin.classList.remove('hidden');
      }

      // AnyDesk ID
      if (status.anydeskId) {
        // format in groups of 3
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

      // Select default checked items that exist
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

    // Group items by category
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
              ${groupCount} item(s) • ${formatBytes(groupBytes)}
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

    // Attach checkbox events
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

    // Check if any high danger items are selected
    const hasIdentity = currentScannedItems.some(
      (i) => selectedItemIds.has(i.id) && i.category === 'identity_reset'
    );

    let warningHtml = `<p>You are about to delete <strong>${selectedItemIds.size} selected item(s)</strong>.</p>`;
    if (hasIdentity) {
      warningHtml += `<p style="margin-top:10px; color:#ffffff; background:#18181b; padding:8px; border:1px solid #71717a; border-radius:4px;">
        ⚠️ <strong>Warning:</strong> Identity files are selected. This will erase your current AnyDesk ID and generate a new one!
      </p>`;
    }
    if (chkAutoBackup.checked) {
      warningHtml += `<p style="margin-top:10px; font-size:11px; color:#888892;">✓ A complete safety backup will be created before cleaning.</p>`;
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
       <ul style="margin:10px 0 10px 20px; font-size:12px; color:#d4d4d8;">
         <li>Generates a brand new AnyDesk ID</li>
         <li>Clears all connection histories & chats</li>
         <li>Wipes all cache and traces</li>
         <li>Automatic full backup will be preserved</li>
       </ul>
       <p style="font-size:11px; color:#888892;">You can restore your previous state anytime from the Backups tab.</p>`,
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

    // Reset steps UI
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
        `<p>🎉 AnyDesk has been completely reset to default state!</p>
         <p style="margin-top:10px;"><strong>Assigned New ID:</strong> ${result.newId}</p>
         <p style="margin-top:6px; font-size:11px; color:#888892;">Your prior settings were backed up to: <code>${result.backupFolder}</code></p>`,
        'Great!'
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
              <div style="font-weight:600; color:#ffffff;">${b.folderName}</div>
              <div style="font-size:10px; color:#71717a;">${dateStr}</div>
            </td>
            <td><span class="badge-danger-safe">${b.label || 'Snapshot'}</span></td>
            <td><code style="font-family:var(--font-mono); font-size:11px;">${b.originalId}</code></td>
            <td>${b.fileCount || 0}</td>
            <td>${formatBytes(b.totalBytes)}</td>
            <td class="text-right">
              <div class="table-actions">
                <button class="btn btn-sm btn-white btn-restore" data-folder="${b.folderName}">Restore</button>
                <button class="btn btn-sm btn-outline btn-del-backup" data-folder="${b.folderName}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      });

      backupsTbody.innerHTML = html;

      // Attach restore and delete handlers
      document.querySelectorAll('.btn-restore').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const folder = e.target.getAttribute('data-folder');
          const confirmed = await showConfirm(
            'Restore Backup',
            `<p>Restore AnyDesk to the state from <strong>${folder}</strong>?</p>
             <p style="margin-top:8px; font-size:11px; color:#888892;">This will replace your current AnyDesk configurations and restore the backed-up ID.</p>`,
            'Restore Now'
          );
          if (!confirmed) return;

          footerStatus.textContent = 'Restoring backup...';
          const res = await window.api.restoreBackup(folder);
          if (res.success) {
            await refreshStatus();
            await showConfirm('Backup Restored', `<p>AnyDesk configuration restored successfully!</p><p>Active ID: <strong>${res.restoredId || 'Restored'}</strong></p>`, 'OK');
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

  // Initial Load
  refreshStatus();
  loadBackups();
  performScan();
});
