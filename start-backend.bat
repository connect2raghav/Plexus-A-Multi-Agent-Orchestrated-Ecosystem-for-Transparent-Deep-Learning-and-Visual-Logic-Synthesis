@echo off
echo Starting Plexus FastAPI Backend...
cd /d "%~dp0"
if not exist "orchestration\.env" (
    echo WARNING: orchestration\.env not found. Copy orchestration\.env.example and add your OpenAI key.
)
python -m uvicorn orchestration.api:app --reload --port 8000 --host 0.0.0.0
