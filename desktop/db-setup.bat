@echo off
chcp 65001 >nul
title Chapino - Database Setup
echo ================================================
echo   Chapino - آماده‌سازی پایگاه‌داده (فقط یک بار)
echo ================================================
echo.

set PSQL=
for /d %%v in ("%ProgramFiles%\PostgreSQL\*") do if exist "%%v\bin\psql.exe" set PSQL=%%v\bin\psql.exe
if "%PSQL%"=="" (
  echo [خطا] PostgreSQL پیدا نشد. ابتدا PostgreSQL را نصب کنید:
  echo https://www.postgresql.org/download/windows/
  pause
  exit /b 1
)

echo PostgreSQL پیدا شد: %PSQL%
echo.
echo رمز کاربر postgres را وارد کنید (هنگام نصب PostgreSQL انتخاب کرده‌اید)
"%PSQL%" -U postgres -h 127.0.0.1 -c "CREATE DATABASE app_db;" 2>nul
echo.

cd /d "%~dp0.."
if not exist ".env" (
  echo DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db> .env
  echo فایل .env ساخته شد. اگر رمز postgres شما چیز دیگری است، آن را در .env اصلاح کنید.
)

echo در حال ساخت جداول...
call npx drizzle-kit push
if errorlevel 1 (
  echo [خطا] ساخت جداول ناموفق بود. رمز داخل .env را بررسی کنید.
  pause
  exit /b 1
)

echo.
echo ✅ پایگاه‌داده آماده شد.
pause
