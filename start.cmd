@echo off
rem Kommatrainer (Königreich Satzland) for Windows; needs Node.js 22.13 or newer.
cd /d "%~dp0Satzland"
if not exist node_modules call npm ci --no-audit --no-fund || exit /b 1
echo Kommatrainer – Königreich Satzland: http://127.0.0.1:5176
echo Beenden mit Strg+C.
npm run dev
