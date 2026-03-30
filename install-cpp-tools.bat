@echo off
echo ================================================
echo  Installing VS C++ Build Tools for Tauri/Rust
echo ================================================
echo.
echo This will download and install ~3-4GB of C++ tools.
echo Keep this window open until finished.
echo.
pause

"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe" modify ^
  --installPath "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools" ^
  --add Microsoft.VisualStudio.Workload.VCTools ^
  --includeRecommended ^
  --passive ^
  --norestart

echo.
echo ================================================
if %ERRORLEVEL% == 0 (
    echo  Done! C++ Build Tools installed successfully.
    echo  You can now run start.bat to build the app.
) else (
    echo  Something went wrong. Exit code: %ERRORLEVEL%
    echo  Try opening "Visual Studio Installer" manually
    echo  and adding "Desktop development with C++"
)
echo ================================================
pause
