@echo off
:: Cafe24 Automated Deployment Script
chcp 65001 > nul

echo 📦 1. Staging and Committing changes...
git add .
git commit -m "auto: deployment update %date% %time%"

echo.
echo 🚀 2. Pushing to Cafe24 (Auto-password)...
node deploy-core.js

if %ERRORLEVEL% equ 0 (
    echo.
    echo 🎉 All done! Your app is being redeployed on Cafe24.
) else (
    echo.
    echo ⚠️  Deployment might have failed. Please check the logs above.
)

pause
