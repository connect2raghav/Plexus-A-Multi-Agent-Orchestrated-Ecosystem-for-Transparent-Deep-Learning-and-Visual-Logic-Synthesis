@echo off
REM Plexus - Start both backend and frontend
REM Run from the plexus/ project root directory.

echo ============================================================
echo  Plexus Startup Script
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.9+ and retry.
    pause & exit /b 1
)

REM Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node.js 18+ and retry.
    pause & exit /b 1
)

REM Install Python deps if venv missing
if not exist "orchestration\venv\Scripts\activate.bat" (
    echo [Setup] Creating Python virtual environment...
    python -m venv orchestration\venv
    call orchestration\venv\Scripts\activate.bat
    pip install -r orchestration\requirements.txt
) else (
    call orchestration\venv\Scripts\activate.bat
)

REM Create .env for backend if missing
if not exist "orchestration\.env" (
    copy "orchestration\.env.example" "orchestration\.env"
    echo [Setup] Created orchestration\.env - add your OPENAI_API_KEY there.
)

REM Create .env.local for frontend if missing
if not exist ".env.local" (
    copy ".env.local.example" ".env.local"
    echo [Setup] Created .env.local
)

REM Install npm deps if needed
if not exist "node_modules" (
    echo [Setup] Installing npm packages...
    npm install
)

echo.
echo [Start] Launching Plexus backend on http://localhost:8000 ...
start "Plexus Backend" cmd /k "call orchestration\venv\Scripts\activate.bat && uvicorn orchestration.api:app --reload --port 8000 --host 0.0.0.0"

timeout /t 2 /nobreak >nul

echo [Start] Launching Plexus frontend on http://localhost:3000 ...
start "Plexus Frontend" cmd /k "npm run dev"

echo.
echo ============================================================
echo  Plexus is starting up!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo ============================================================
echo.
pause
