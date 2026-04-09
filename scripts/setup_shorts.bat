@echo off
chcp 437 >nul
echo === Trend Eng Shorts Setup ===
echo.

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found in PATH.
    echo Install from: https://www.python.org/downloads/
    echo Check "Add Python to PATH" during install!
    pause
    exit /b 1
)

python --version
echo.

python -m pip install --upgrade pip

echo [1/6] Installing edge-tts...
python -m pip install edge-tts

echo [2/6] Installing Pillow...
python -m pip install Pillow

echo [3/6] Installing numpy...
python -m pip install numpy

echo [4/6] Installing ffmpeg-python...
python -m pip install ffmpeg-python

echo [5/6] Installing google-api-python-client...
python -m pip install google-api-python-client

echo [6/6] Installing google-auth-oauthlib...
python -m pip install google-auth-oauthlib

echo.
echo === Checking FFmpeg ===
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] FFmpeg not found. Run: winget install ffmpeg
) else (
    ffmpeg -version 2>&1 | findstr "ffmpeg version"
    echo FFmpeg OK!
)

echo.
echo === Setup complete! ===
echo Next: python scripts\youtube_auth.py
pause
