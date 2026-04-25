"""
uploader.py — YouTube Data API v3로 쇼츠 자동 업로드

사전 준비:
  1. Google Cloud Console에서 YouTube Data API v3 활성화
  2. OAuth2 클라이언트 ID 생성 → client_secrets.json 다운로드
  3. pip install google-auth google-auth-oauthlib google-api-python-client
"""

import os
import json
from pathlib import Path
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
TOKEN_FILE = 'youtube_token.json'
SECRETS_FILE = 'client_secrets.json'


def _get_credentials() -> Credentials:
    creds = None

    if Path(TOKEN_FILE).exists():
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(SECRETS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())

    return creds


def upload_short(
    video_path: str,
    title: str,
    description: str = "",
    tags: list = None
) -> dict:
    """
    YouTube Shorts 업로드

    Args:
        video_path: MP4 파일 경로
        title: 영상 제목 (100자 이하)
        description: 설명
        tags: 태그 리스트

    Returns:
        dict: {'id': 'youtube_video_id', 'url': 'https://...'}
    """
    creds = _get_credentials()
    youtube = build('youtube', 'v3', credentials=creds)

    default_tags = ['영어학습', '영어회화', '명대사', 'Shorts',
                    'EnglishLearning', 'TrendEng']
    if tags:
        default_tags.extend(tags)

    body = {
        'snippet': {
            'title': title,
            'description': description + '\n\n#Shorts #영어학습 #명대사',
            'tags': default_tags,
            'categoryId': '27',       # Education
            'defaultLanguage': 'ko',
        },
        'status': {
            'privacyStatus': 'public',
            'selfDeclaredMadeForKids': False,
        }
    }

    media = MediaFileUpload(
        video_path,
        mimetype='video/mp4',
        resumable=True,
        chunksize=1024 * 1024  # 1MB 청크
    )

    request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"      업로드 중: {int(status.progress() * 100)}%")

    video_id = response['id']
    url = f"https://www.youtube.com/shorts/{video_id}"
    print(f"      ✅ 업로드 완료: {url}")
    return {'id': video_id, 'url': url}


def upload_all_shorts(output_dir: str, movie_title: str) -> list:
    """
    output_dir 내 모든 shorts_*.mp4 파일을 순서대로 업로드

    Returns:
        list: 업로드된 YouTube URL 목록
    """
    mp4_files = sorted(Path(output_dir).glob("shorts_*.mp4"))
    urls = []

    for i, mp4 in enumerate(mp4_files):
        title = f"{movie_title} — 명대사 {i+1} | 영어 학습 #Shorts"
        description = (
            f"🎬 {movie_title}\n"
            f"명대사로 배우는 영어! Trend Eng와 함께 학습해보세요.\n\n"
            f"🔗 전체 학습: https://minohlee.mooo.com/punchline"
        )
        result = upload_short(str(mp4), title, description)
        urls.append(result['url'])

    return urls
