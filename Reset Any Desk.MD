
@echo off
setlocal EnableExtensions
title AnyDesk Reset Utility

echo ==========================================
echo          AnyDesk Reset Utility
echo ==========================================
echo.
echo 1. Safe reset: back up and restart service
echo 2. Open AnyDesk configuration folders
echo 3. Hard reset: back up and clean temporary cache
echo 4. Exit
echo.
choice /c 1234 /n /m "Select an option: "

if errorlevel 4 exit /b 0
if errorlevel 3 goto hard_reset
if errorlevel 2 goto folders
if errorlevel 1 goto safe_reset

:safe_reset
call :admin_check || exit /b 1

echo.
echo Restarting AnyDesk service...
powershell -NoProfile -Command ^
 "$ErrorActionPreference='Stop'; try { $s=Get-Service AnyDesk -ErrorAction Stop; if ($s.Status -ne 'Stopped') { Stop-Service AnyDesk -ErrorAction Stop; $s.WaitForStatus('Stopped',[TimeSpan]::FromSeconds(30)) }; Start-Service AnyDesk -ErrorAction Stop; $s.WaitForStatus('Running',[TimeSpan]::FromSeconds(30)); exit 0 } catch { Write-Error $_; exit 1 }"

if errorlevel 1 (
    echo Service restart failed.
    pause
    exit /b 1
)
echo Safe reset completed. Configuration was preserved.
pause
exit /b 0

:folders
if exist "%ProgramData%\AnyDesk" start "" explorer "%ProgramData%\AnyDesk"
if exist "%APPDATA%\AnyDesk" start "" explorer "%APPDATA%\AnyDesk"
if exist "%LOCALAPPDATA%\AnyDesk" start "" explorer "%LOCALAPPDATA%\AnyDesk"
pause
exit /b 0

:hard_reset
call :admin_check || exit /b 1

echo.
echo WARNING: This cleans temporary/cache data only.
echo It does not erase identity, credentials, event logs,
echo or all registry entries.
echo.
choice /c YN /n /m "Continue with hard cleanup? (Y/N): "
if errorlevel 2 exit /b 0

set "BACKUP=%USERPROFILE%\Desktop\AnyDesk-Backup-%RANDOM%"
mkdir "%BACKUP%" 2>nul
if not exist "%BACKUP%\" (
    echo ERROR: Cannot create backup directory.
    pause
    exit /b 1
)

echo.
echo [1/3] Backing up configuration...

if exist "%ProgramData%\AnyDesk\" (
    robocopy "%ProgramData%\AnyDesk" "%BACKUP%\System" /E /COPY:DAT /R:1 /W:1
    if errorlevel 8 goto backup_error
)

if exist "%APPDATA%\AnyDesk\" (
    robocopy "%APPDATA%\AnyDesk" "%BACKUP%\User" /E /COPY:DAT /R:1 /W:1
    if errorlevel 8 goto backup_error
)

echo.
echo [2/3] Stopping AnyDesk service...

powershell -NoProfile -Command ^
 "$ErrorActionPreference='Stop'; try { $s=Get-Service AnyDesk -ErrorAction Stop; if ($s.Status -ne 'Stopped') { Stop-Service AnyDesk -ErrorAction Stop; $s.WaitForStatus('Stopped',[TimeSpan]::FromSeconds(30)) }; exit 0 } catch { Write-Error $_; exit 1 }"

if errorlevel 1 (
    echo ERROR: Could not stop the service. Cleanup cancelled.
    echo Backup: %BACKUP%
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning known temporary/cache locations...

if exist "%TEMP%\AnyDesk" (
    rd /s /q "%TEMP%\AnyDesk"
)

if exist "%LOCALAPPDATA%\AnyDesk\cache" (
    rd /s /q "%LOCALAPPDATA%\AnyDesk\cache"
)

if exist "%APPDATA%\AnyDesk\thumbnails" (
    rd /s /q "%APPDATA%\AnyDesk\thumbnails"
)

echo.
echo Cache cleanup completed.
echo Configuration backup: %BACKUP%
echo.
echo The AnyDesk service remains stopped.
echo Start AnyDesk normally when you are ready.
echo Identity and security settings were not intentionally deleted.
pause
exit /b 0

:backup_error
echo ERROR: Backup failed. Cleanup cancelled.
pause
exit /b 1

:admin_check
fltmc >nul 2>&1
if errorlevel 1 (
    echo ERROR: Run this script as administrator.
    pause
    exit /b 1
)
exit /b 0