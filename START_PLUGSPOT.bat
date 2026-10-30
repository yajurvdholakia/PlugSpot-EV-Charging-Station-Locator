@echo off
setlocal
cd /d "%~dp0"
title PlugSpot - Windows Launcher
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Node.js not found. Install Node.js LTS from https://nodejs.org/ then reopen this file.
 pause
 exit /b 1
)
node -e "if(parseInt(process.versions.node)<20){console.error('Node.js 20.9+ required');process.exit(1)}"
if errorlevel 1 (pause & exit /b 1)
if not exist "db\custom.db" (echo ERROR: db\custom.db is missing & pause & exit /b 1)
if not exist "db\custom.backup.db" copy /Y "db\custom.db" "db\custom.backup.db" >nul
if not exist "node_modules\.bin\prisma.cmd" (
 echo Installing project packages. First run can take a few minutes...
 call npm install
 if errorlevel 1 (echo npm install failed & pause & exit /b 1)
)
echo Generating Prisma client...
call .\node_modules\.bin\prisma.cmd generate
if errorlevel 1 (
 echo Prisma generate failed. Close all other Next.js / Prisma windows, then retry.
 pause
 exit /b 1
)
echo Checking station count in bundled SQLite database...
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.station.count().then(n=>{console.log('Stations in database:',n);return p.$disconnect()}).catch(e=>{console.error(e);process.exitCode=1})"
if errorlevel 1 (echo Database check failed & pause & exit /b 1)
echo Starting PlugSpot at http://localhost:3000
start "" "http://localhost:3000"
call npm run dev
pause
