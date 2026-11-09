# Any Reset ⚡ — AnyDesk Maintenance & Factory Reset Utility

[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://github.com/arybishal/Reset-Anydesk-with-Option)
[![Software](https://img.shields.io/badge/App-Any%20Reset%20GUI-000000?logo=electron&logoColor=white)](https://github.com/arybishal/Reset-Anydesk-with-Option/releases)
[![Script](https://img.shields.io/badge/Script-Batch%20%2F%20PowerShell-107C41?logo=gnubash&logoColor=white)](reset-anydesk.bat)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <img src="assets/banner.svg" alt="Any Reset Banner" width="100%" />
</p>

An intelligent, multi-option Windows utility software to **scan, clean, and completely reset AnyDesk to its default factory state** with an assigned **brand-new AnyDesk ID**. Built with an ultra-sleek, modern **monochrome Black & White design**.

---

## ⚡ Direct Download

Grab the ready-to-run Windows standalone executable (no installation required):

📦 **[Download Any Reset v1.0.0 Portable (.exe)](https://github.com/arybishal/Reset-Anydesk-with-Option/releases/latest)**

---

## 🖤 Design & Aesthetic (Black & White Edition)

Any Reset is built with a minimalist, high-contrast monochrome aesthetic:
* **Deep Void Palette (`#09090b` / `#000000`)** with clean hairline borders (`#27272a`).
* **Custom Windows Titlebar** with drag region, minimize/maximize/close controls, and an Administrator elevation indicator.
* **Live System Telemetry Bar**:
  - **Current AnyDesk ID** detection with 1-click clipboard copy.
  - **AnyDesk Windows Service** monitor (*Running*, *Stopped*, or *Not Installed*) with toggle.
  - **Process Counter** with a 1-click "Kill All" termination button.
  - Direct "Launch AnyDesk" and "Elevate Admin" shortcuts.

---

## ✨ Features

### 1. 🔍 Comprehensive Scanner & Granular Cleaner
Scans all AnyDesk footprints on your system:
- **Cache & Temp Storage**: `%LOCALAPPDATA%\AnyDesk\cache`, `%APPDATA%\AnyDesk\cache`, `%ProgramData%\AnyDesk\cache`, `%TEMP%\AnyDesk`
- **Thumbnails**: Remote connection preview snapshots (`%APPDATA%\AnyDesk\thumbnails`, `%LOCALAPPDATA%\AnyDesk\thumbnails`)
- **Traces & Logs**: `ad.trace`, `ad_svc.trace`, `connection_trace.txt`
- **User History**: Speed dial favorites, address book (`user.conf`), and text chats (`%APPDATA%\AnyDesk\chat`)
- **Identity & Registration**: `system.conf`, `service.conf`
- **Registry Traces**: `HKCU\Software\AnyDesk`

**Capabilities:**
* Displays exact item count and human-readable size (KB/MB).
* Granular checkboxes with instant filter presets: *All*, *Cache & Logs Only (Safe)*, *User History*, *None*.
* Clean selected items safely with automatic pre-clean backup.

---

### 2. 🚀 Factory Reset (Like Newly Installed)
Resets AnyDesk completely to an out-of-the-box factory state:
1. **Auto Safety Backup**: Complete snapshot saved to `C:\Users\<User>\AnyReset-Backups`.
2. **Process Termination**: Closes all active `AnyDesk.exe` background and UI tasks.
3. **Service Management**: Stops the background Windows service.
4. **Identity & Cache Purge**: Clears hardware fingerprints, client UUIDs, authorization tokens, traces, and caches.
5. **Registry Reset**: Purges Windows registry settings.
6. **Re-initialization**: Starts the service fresh — **AnyDesk will generate and register a brand-new AnyDesk ID**!

---

### 3. 🛡️ Backups & 1-Click Restore Hub
* Automatically saves a timestamped snapshot before every wipe or reset.
* Lists all saved snapshots with dates, original AnyDesk IDs, file counts, and sizes.
* **1-Click Restore**: Revert to any previous backup at any time.
* Direct button to explore backup archives in Windows Explorer.

---

### 4. 🧰 Tools & Utilities
* **Safe Reset**: Non-destructively restarts the AnyDesk Windows service to resolve frozen incoming connections without losing your ID or settings.
* **Explorer Jump**: Quick-open buttons for `%ProgramData%`, `%APPDATA%`, `%LOCALAPPDATA%`, and `%TEMP%`.
* **Process & Service Controls**: Force terminate all processes, start/stop service.
* **CLI Utility**: Original `reset-anydesk.bat` is preserved for terminal/headless usage.

---

## 🚀 How to Run

### Option A: Portable Standalone Executable (Recommended)
Download and run:
```text
dist\Any Reset-v1.0.0-Portable.exe
```

### Option B: Run from Source / Development
```bash
# Clone the repository
git clone https://github.com/arybishal/Reset-Anydesk-with-Option.git
cd Reset-Anydesk-with-Option

# Install dependencies
npm install

# Start the application
npm start
```
Or double-click [`Start-AnyReset.bat`](Start-AnyReset.bat).

### Option C: Classic Batch Script (CLI)
Right-click [`reset-anydesk.bat`](reset-anydesk.bat) and choose **"Run as administrator"**.

---

## 📁 Repository Structure

```text
Reset-Anydesk-with-Option/
├── assets/                    # Graphic assets and banners
│   ├── banner.svg
│   └── cli-preview.svg
├── dist/                      # Standalone binary builds
│   └── Any Reset-v1.0.0-Portable.exe
├── src/                       # Frontend application sources
│   ├── index.html             # High-contrast Black & White UI
│   ├── style.css              # Monochrome design system
│   └── renderer.js            # UI logic & IPC bindings
├── main.js                    # Electron main process & Windows APIs
├── preload.js                 # Secure context bridge
├── reset-anydesk.bat          # Classic interactive CLI batch script
├── Start-AnyReset.bat         # 1-click launcher for Windows
├── package.json               # Project manifest and electron-builder config
└── README.md                  # Documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
