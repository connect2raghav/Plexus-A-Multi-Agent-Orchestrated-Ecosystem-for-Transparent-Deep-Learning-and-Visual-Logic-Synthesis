@echo off
REM ============================================================
REM  Plexus - One-click Startup Script
REM  Installs dependencies if missing, then starts both servers.
REM ============================================================

echo.
echo  ============================================================
echo   ____  _
echo  ^|  _ \^| ^| _____  ___   _ ___
echo  ^| ^|_) ^| ^|/ _ \ \/ / ^| ^| / __^|
echo  ^|  __/^| ^|  __/^>  ^<^| ^|_^| \__ \
echo  ^|_^|   ^|_^|\___/_/\_\\__,_^|___/
echo.
echo   Plexus Startup
echo  ============================================================
echo.

REM ------ Check Python ------
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.9+ and retry.
    pause & exit /b 1
)

REM ------ Check Node ------
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node.js 18+ and retry.
    pause & exit /b 1
)

REM ==============================================================
REM  Backend Setup (Python)
REM ==============================================================

echo [Backend] Checking Python environment...

if exist "backend\venv\Scripts\activate.bat" (
    echo [Backend] Virtual environment found. Activating...
    call backend\venv\Scripts\activate.bat
) else (
    echo [Backend] Creating virtual environment...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    echo [Backend] Installing Python dependencies...
    pip install -r backend\requirements.txt
)

REM Create .env for backend if missing
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env"
        echo [Backend] Created backend\.env — add your API keys there.
    )
)

REM Create uploads dir if missing
if not exist "backend\uploads" (
    mkdir backend\uploads
)

REM ==============================================================
REM  Frontend Setup (Node.js)
REM ==============================================================

echo [Frontend] Checking Node packages...

if exist "frontend\node_modules" (
    echo [Frontend] node_modules found. Skipping install.
) else (
    echo [Frontend] Installing npm packages...
    cd frontend
    npm install --legacy-peer-deps
    cd ..
)

REM Create .env.local for frontend if missing
if not exist "frontend\.env.local" (
    echo NEXT_PUBLIC_PLEXUS_API_URL=http://localhost:8000> frontend\.env.local
    echo [Frontend] Created frontend\.env.local
)

REM ==============================================================
REM  Launch Servers
REM ==============================================================

echo.
echo [Start] Launching Plexus backend on http://localhost:8000 ...
start "Plexus Backend" cmd /k "cd /d %~dp0 && call backend\venv\Scripts\activate.bat && uvicorn backend.api:app --reload --port 8000 --host 0.0.0.0"

timeout /t 3 /nobreak >nul

echo [Start] Launching Plexus frontend on http://localhost:3000 ...
start "Plexus Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  ============================================================
echo   Plexus is starting up!
echo.
echo     Frontend:  http://localhost:3000
echo     Backend:   http://localhost:8000
echo     API Docs:  http://localhost:8000/docs
echo  ============================================================
echo.
pause
