@echo off
powershell.exe -NoProfile -File "%~dp0scripts\abrir.ps1"
if errorlevel 1 pause
