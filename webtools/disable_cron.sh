#!/bin/bash

# 크론탭 설정을 백업할 파일 경로 (복구를 위해)
BACKUP_FILE="/home/lmo0317ea/aieng/webtools/crontab_backup_$(date +%Y%m%d_%H%M%S).txt"

# 현재 등록된 크론탭이 있는지 확인
CURRENT_CRON=$(crontab -l 2>/dev/null)

if [ -z "$CURRENT_CRON" ]; then
    echo "현재 등록된 크론 작업이 없습니다."
else
    # 1. 기존 설정을 파일로 백업
    echo "$CURRENT_CRON" > "$BACKUP_FILE"
    echo "기존 크론탭 설정을 다음 파일에 백업했습니다: $BACKUP_FILE"

    # 2. 모든 크론탭 제거
    crontab -r
    echo "모든 크론 작업을 중지(제거)했습니다."
fi

# 상태 확인
echo "--- 현재 크론탭 설정 ---"
crontab -l 2>/dev/null || echo "(등록된 작업 없음)"
