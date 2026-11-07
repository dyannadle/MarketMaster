@echo off
echo ===================================================
echo   MarketMaster Terminal (React 19 + TanStack)
echo ===================================================
cd /d "%~dp0frontend"

where pnpm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using pnpm dev server...
    pnpm run dev --port 3000 --open
) else (
    where npx >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo Using npx pnpm dev server...
        npx pnpm run dev --port 3000 --open
    ) else (
        echo Using npm dev server...
        npm run dev -- --port 3000 --open
    )
)
