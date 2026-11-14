@echo off
title MarketMaster Launcher & Health Reconciler
color 0A
echo ===================================================================
echo   MarketMaster Institutional Trading Terminal ^& RMS Suite
echo   SEBI PRAN Compliant ^| Black-Scholes Quant Engine ^| PWA Terminal
echo ===================================================================
echo.

echo [INFO] Running Pre-Flight Smoke Test Reconciliation...
python scripts\smoke_test_services.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Smoke test detected environment issues. Press any key to start anyway or Ctrl+C to abort...
    pause >nul
)

echo.
echo [1/2] Starting Python FastAPI Quant Backend on http://localhost:8000 ...
start "MarketMaster Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [2/2] Starting TanStack Nitro SSR UI on http://localhost:3000 ...
start "MarketMaster Frontend" cmd /k "cd frontend && pnpm run dev --port 3000 --open"

echo.
echo ===================================================================
echo All services launching in separate windows!
echo Terminal is accessible at: http://localhost:3000
echo Quant API Swagger Docs at: http://localhost:8000/docs
echo ===================================================================
