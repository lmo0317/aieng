#!/bin/bash

# news.sh의 절대 경로
NEWS_SCRIPT="/home/lmo0317ea/aieng/webtools/news.sh"
# 크론탭에 등록할 명령어 (매시 0분에 실행, 로그 기록 포함)
CRON_COMMAND="0 * * * * $NEWS_SCRIPT 1 >> /home/lmo0317ea/aieng/webtools/news_cron.log 2>&1"

# 1. news.sh에 실행 권한 부여
chmod +x "$NEWS_SCRIPT"

# 2. 이미 등록되어 있는지 확인
(crontab -l 2>/dev/null | grep -F "$NEWS_SCRIPT 1") > /dev/null

if [ $? -eq 0 ]; then
    echo "이미 크론탭에 등록되어 있습니다."
else
    # 3. 기존 크론탭 내용에 새 명령어 추가하여 등록
    (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -
    echo "크론탭 등록이 완료되었습니다: 매시간 정각에 실행됩니다."
fi

# 현재 등록된 크론탭 확인
echo "--- 현재 크론탭 설정 ---"
crontab -l
