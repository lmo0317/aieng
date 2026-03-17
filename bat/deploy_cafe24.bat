@echo off
chcp 65001 > nul
echo ===================================================
echo   🚀 Cafe24 자동 배포 스크립트 (Git Push)
echo ===================================================

:: 1. 변경사항 스테이징
echo [1/3] 변경사항을 스테이징합니다...
git add .

:: 2. 커밋 메시지 입력 및 커밋
echo.
set /p commit_msg="[2/3] 커밋 메시지를 입력하세요 (엔터 시 기본값 사용): "
if "%commit_msg%"=="" set commit_msg=Auto deploy to Cafe24
git commit -m "%commit_msg%"

:: 3. Cafe24로 푸시 (리모트 이름이 cafe24, 브랜치가 master라고 가정)
:: 다른 리모트 이름이나 브랜치를 사용하신다면 아래 줄을 수정해주세요.
echo.
echo [3/3] Cafe24 서버로 푸시합니다...
git push cafe24 master --force

echo.
echo ===================================================
echo   ✅ 배포 과정이 완료되었습니다!
echo ===================================================
pause
