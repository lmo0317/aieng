@echo off
echo ==============================
echo  Deploying to 43.106.114.167
echo ==============================

ssh root@43.106.114.167 "cd /root/aieng && git pull && pkill -f 'node web.js'; sleep 1 && nohup npm start > /root/aieng/server.log 2>&1 & echo Server restarted"

echo.
echo Done.
pause
