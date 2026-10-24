@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\abrir.ps1"
if errorlevel 1 pause
