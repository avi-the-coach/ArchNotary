@echo off
cd /d "%~dp0"

echo Clearing port 1420 if in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":1420 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting... > tauri-dev.log
npm run tauri -- dev 2>&1 | "C:\Program Files\Git\usr\bin\tee.exe" tauri-dev.log
echo Exit code: %ERRORLEVEL% >> tauri-dev.log
pause
