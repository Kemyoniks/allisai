@echo off
title Math Rhythm Launcher
cd /d "%~dp0"

echo ========================================================
echo       Starting Math Rhythm Desktop Arcade Game
echo ========================================================
echo.

:: Check if server is already responding on port 8080
powershell -Command "try { $res = Invoke-WebRequest -Uri 'http://localhost:8080' -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Starting background game server on http://localhost:8080/ ...
    start /b powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0server.ps1" -NoBrowser
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Game server is already active on http://localhost:8080/
)

echo [2/2] Launching Math Rhythm in standalone Desktop App window...

:: Attempt to launch in Microsoft Edge App Mode (Standard on Windows 10/11)
where msedge >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start msedge --app=http://localhost:8080/ --window-size=1280,750
    goto DONE
)

:: Fallback to Google Chrome App Mode
where chrome >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start chrome --app=http://localhost:8080/ --window-size=1280,750
    goto DONE
)

:: Default browser fallback
start http://localhost:8080/

:DONE
echo.
echo Math Rhythm is running! Enjoy playing!
exit /b 0
