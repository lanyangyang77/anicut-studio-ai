@echo off
echo === AniCut Studio Launcher ===
echo.

REM Start Backend
echo [1/2] Starting Backend (port 3001)...
start "AniCut-Backend" cmd /c "cd /d "C:\Users\sy\Documents\Codex\2026-06-29\ai-1-2-ai-3-ai\ai-clip-studio\apps\server" && pnpm run dev"

REM Wait a few seconds for backend
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/2] Starting Frontend (port 5173)...
start "AniCut-Frontend" cmd /c "cd /d "C:\Users\sy\Documents\Codex\2026-06-29\ai-1-2-ai-3-ai\ai-clip-studio\apps\web" && pnpm run dev"

echo.
echo ========================================
echo  AniCut Studio is starting up!
echo ========================================
echo.
echo  Access locally:  http://localhost:5173
echo  API Docs:        http://localhost:3001/api/docs
echo.
echo  To share with friends:
echo   1. Download ngrok from https://ngrok.com
echo   2. Run: ngrok http 3001
echo   3. Share the https://xxxx.ngrok-free.app URL
echo.
echo  Or deploy permanently (recommended):
echo   1. Push to GitHub
echo   2. Deploy backend to Render.com (free)
echo   3. Deploy frontend to Vercel.com (free)
echo.
echo ========================================
pause