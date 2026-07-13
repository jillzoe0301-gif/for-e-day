@echo off
chcp 65001 >nul
title 天數計算系統｜Vercel 正式部署
cd /d "%~dp0"
echo.
echo ========================================
echo   天數計算系統 V1.1｜正式部署
echo ========================================
echo.
where npx >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 npx，請先安裝 Node.js。
  pause
  exit /b 1
)
call npx vercel --prod
if errorlevel 1 (
  echo.
  echo 部署未完成。若尚未登入，請先執行：npx vercel login
  pause
  exit /b 1
)
echo.
echo 部署完成。
pause
