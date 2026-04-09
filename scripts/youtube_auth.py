#!/usr/bin/env python3
"""
youtube_auth.py - YouTube OAuth2 최초 인증 (한 번만 실행)
브라우저가 열리면 lmo0317work@gmail.com 으로 로그인 후 허용
token.pickle 파일이 생성되면 이후 자동 로그인됨
"""

import pickle
import glob
import os
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
SCRIPTS_DIR = Path(__file__).parent
TOKEN_PATH = SCRIPTS_DIR / 'youtube_token.pickle'


def find_client_secrets():
    patterns = [
        str(SCRIPTS_DIR / 'client_secret*.json'),
        str(SCRIPTS_DIR / 'client_secrets.json'),
    ]
    for pattern in patterns:
        files = glob.glob(pattern)
        if files:
            return files[0]
    return None


def main():
    secrets_file = find_client_secrets()
    if not secrets_file:
        print('[ERROR] client_secret*.json not found in scripts/ folder')
        return

    print(f'[INFO] Using credentials: {os.path.basename(secrets_file)}')
    print('[INFO] Opening browser for Google login...')
    print('[INFO] Login with: lmo0317work@gmail.com')

    flow = InstalledAppFlow.from_client_secrets_file(secrets_file, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(TOKEN_PATH, 'wb') as f:
        pickle.dump(creds, f)

    # 연결 테스트
    youtube = build('youtube', 'v3', credentials=creds)
    resp = youtube.channels().list(part='snippet', mine=True).execute()
    channel = resp['items'][0]['snippet']['title'] if resp.get('items') else 'Unknown'

    print(f'\n[OK] Auth complete! Channel: {channel}')
    print(f'[OK] Token saved: {TOKEN_PATH}')
    print('\nNow run: python scripts\\generate_shorts.py <trend_id> --upload')


if __name__ == '__main__':
    main()
