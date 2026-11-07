@echo off
echo ===================================================
echo   MarketMaster Institutional Trading Terminal
echo ===================================================
echo.
echo 1. Starting Python FastAPI Quant Backend on http://localhost:8000 ...
start "MarketMaster Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo 2. Starting Modern TanStack UI on http://localhost:3000 ...
start "MarketMaster Frontend" cmd /k "cd frontend && pnpm run dev --port 3000 --open"

echo.
echo Both services launched! Terminal opening in your default browser.
echo ===================================================

