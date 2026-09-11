@echo off
chcp 65001 >nul
title Chapino - Build Setup.exe
echo ==================================================
echo   Chapino - ساخت فایل نصبی ویندوز (Setup.exe)
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [خطا] Node.js نصب نیست. ابتدا از nodejs.org نسخه LTS را نصب کنید.
  pause
  exit /b 1
)

echo [1/4] نصب وابستگی‌های برنامه...
cd /d "%~dp0.."
call npm install
if errorlevel 1 goto :err

echo.
echo [2/4] ساخت نسخه تولیدی برنامه...
call npm run build
if errorlevel 1 goto :err

echo.
echo [3/4] نصب ابزار بسته‌بندی دسکتاپ...
cd /d "%~dp0"
call npm install
if errorlevel 1 goto :err

echo.
echo [4/4] ساخت فایل Setup.exe ...
call npx electron-builder --win
if errorlevel 1 goto :err

echo.
echo ==================================================
echo ✅ تمام شد!
echo فایل نصبی در این مسیر ساخته شد:
echo   desktop\dist-setup\Chapino-Setup-1.0.0.exe
echo ==================================================
echo این فایل را اجرا کنید تا برنامه با میان‌بر دسکتاپ نصب شود.
pause
exit /b 0

:err
echo.
echo [خطا] ساخت ناموفق بود. پیام‌های بالا را بررسی کنید.
pause
exit /b 1
