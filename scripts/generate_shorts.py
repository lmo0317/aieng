#!/usr/bin/env python3
"""
generate_shorts.py - Trend Eng 숏츠 영상 생성기
Usage:
  python generate_shorts.py <trend_id>              # 영상 생성만
  python generate_shorts.py <trend_id> --upload     # 생성 + YouTube 업로드

Output: JSON lines to stdout
  {"step": "tts", "message": "...", "progress": 10}
  {"step": "done", "output": "path/to/final.mp4"}
  {"step": "uploaded", "youtube_id": "xxxx", "url": "https://youtu.be/xxxx"}
  {"step": "error", "message": "..."}
"""

import sys
import os
import json
import asyncio
import glob
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# ── 설정 ──────────────────────────────────────────────────────────────────────
W, H = 1080, 1920
FPS = 30

COLORS = {
    "bg_top":    (8,   8,  18),    # #08080f
    "bg_bottom": (22,  22, 46),    # #16162e
    "card_bg":   (255, 255, 255),  # card 약간 밝게
    "accent":    (108, 99, 255),   # #6C63FF 퍼플
    "accent2":   (255, 214, 10),   # #FFD60A 옐로
    "text_main": (255, 255, 255),  # 흰색
    "text_sub":  (160, 160, 184),  # 연한 회색
    "text_ko":   (200, 200, 220),  # 한글
    "divider":   (60,  60,  90),   # 구분선
}

# 목소리
VOICE_EN = "en-US-AriaNeural"
VOICE_KO = "ko-KR-SunHiNeural"

# ── 유틸 ──────────────────────────────────────────────────────────────────────
def log(step: str, msg: str, progress: int = None, **kwargs):
    data = {"step": step, "message": msg}
    if progress is not None:
        data["progress"] = progress
    data.update(kwargs)
    print(json.dumps(data, ensure_ascii=False), flush=True)


def get_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def find_font(names: list, size: int) -> ImageFont.FreeTypeFont:
    """Windows 폰트 폴더에서 폰트를 찾아 로드"""
    font_dirs = [
        r"C:\Windows\Fonts",
        r"C:\Users\Public\Fonts",
    ]
    for name in names:
        for d in font_dirs:
            p = os.path.join(d, name)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


# ── 배경 그라디언트 ────────────────────────────────────────────────────────────
def make_gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H))
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    top = np.array(COLORS["bg_top"])
    bot = np.array(COLORS["bg_bottom"])
    for y in range(H):
        t = y / H
        arr[y] = (top * (1 - t) + bot * t).astype(np.uint8)
    img = Image.fromarray(arr)
    return img


# ── 텍스트 래핑 (Pillow용) ─────────────────────────────────────────────────────
def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines = []
    current = ""
    dummy = Image.new("RGB", (1, 1))
    draw = ImageDraw.Draw(dummy)
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


# ── 카드 이미지 생성 ───────────────────────────────────────────────────────────
def make_card(
    idx: int,
    total: int,
    sentence: dict,
    category: str = "",
    trend_title: str = "",
) -> Image.Image:
    img = make_gradient_bg()
    draw = ImageDraw.Draw(img)

    pad = 60  # 좌우 패딩
    content_w = W - pad * 2

    # 폰트 로드
    f_brand   = find_font(["malgunbd.ttf", "arialbd.ttf", "arial.ttf"], 38)
    f_counter = find_font(["malgunbd.ttf", "arialbd.ttf"], 38)
    f_main    = find_font(["arialbd.ttf", "malgunbd.ttf"], 80)
    f_ko      = find_font(["malgunbd.ttf", "malgun.ttf"], 68)
    f_voca    = find_font(["malgun.ttf", "malgunbd.ttf"], 50)
    f_bar     = find_font(["malgun.ttf", "malgunbd.ttf"], 30)

    # ── 상단 바 ───────────────────────────────────────────────────
    top_bar_h = 110
    draw.rectangle([(0, 0), (W, top_bar_h)], fill=(12, 12, 25))
    draw.text((pad, 32), "TREND ENG", font=f_brand, fill=COLORS["accent"])
    counter_text = f"{idx}/{total}"
    cb = draw.textbbox((0, 0), counter_text, font=f_counter)
    draw.text((W - pad - (cb[2] - cb[0]), 32), counter_text, font=f_counter, fill=COLORS["text_sub"])

    # ── 콘텐츠 준비 ───────────────────────────────────────────────
    en_text  = sentence.get("en", "")
    ko_text  = sentence.get("ko", "")
    voca_raw = sentence.get("voca", [])
    # voca: 문자열 리스트 또는 dict 리스트 모두 처리
    voca_lines = []
    for v in voca_raw:
        if isinstance(v, dict):
            word = v.get("word") or v.get("en") or ""
            meaning = v.get("meaning") or v.get("ko") or ""
            voca_lines.append(f"{word}  {meaning}" if meaning else word)
        else:
            voca_lines.append(str(v))

    en_lines     = wrap_text(en_text, f_main, content_w)
    ko_lines     = wrap_text(ko_text, f_ko, content_w)
    voca_wrapped = [wrap_text(v, f_voca, content_w) for v in voca_lines]

    en_lh   = 100  # 영어 줄 높이
    ko_lh   = 86   # 한국어 줄 높이
    vo_lh   = 64   # 단어 줄 높이
    div_h   = 50   # 구분선 여백

    divs    = 2 if voca_lines else 1
    en_h    = len(en_lines) * en_lh
    ko_h    = len(ko_lines) * ko_lh
    vo_h    = sum(len(wl) for wl in voca_wrapped) * vo_lh
    total_h = en_h + ko_h + vo_h + divs * div_h

    content_area_top = top_bar_h + 40
    content_area_bot = H - 120
    available_h = content_area_bot - content_area_top

    y = content_area_top + max(0, (available_h - total_h) // 2)

    # ── 영어 문장 ─────────────────────────────────────────────────
    for line in en_lines:
        draw.text((pad, y), line, font=f_main, fill=COLORS["text_main"])
        y += en_lh
    y += 10
    draw.rectangle([(pad, y), (W - pad, y + 2)], fill=COLORS["divider"])
    y += div_h - 10

    # ── 한국어 번역 ───────────────────────────────────────────────
    for line in ko_lines:
        draw.text((pad, y), line, font=f_ko, fill=COLORS["text_ko"])
        y += ko_lh

    # ── 단어 ─────────────────────────────────────────────────────
    if voca_wrapped:
        y += 10
        draw.rectangle([(pad, y), (W - pad, y + 2)], fill=COLORS["divider"])
        y += div_h - 10
        for wrapped in voca_wrapped:
            for line in wrapped:
                draw.text((pad, y), line, font=f_voca, fill=COLORS["accent2"])
                y += vo_lh

    # ── 하단 진행 바 ──────────────────────────────────────────────
    bar_y = H - 80
    bar_h = 8
    bar_total_w = W - pad * 2
    draw.rectangle([(pad, bar_y), (W - pad, bar_y + bar_h)], fill=COLORS["divider"])
    progress_w = int(bar_total_w * idx / total)
    if progress_w > 0:
        draw.rounded_rectangle(
            [(pad, bar_y), (pad + progress_w, bar_y + bar_h)],
            radius=4, fill=COLORS["accent"]
        )
    bottom_text = f"{idx} of {total} sentences"
    draw.text((pad, H - 50), bottom_text, font=f_bar, fill=COLORS["text_sub"])

    return img


# ── TTS 생성 ─────────────────────────────────────────────────────────────────
async def generate_tts_async(text: str, voice: str, output_path: str):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


def generate_tts(text: str, voice: str, output_path: str):
    asyncio.run(generate_tts_async(text, voice, output_path))


# ── FFmpeg로 이미지+오디오 → 비디오 클립 ──────────────────────────────────────
def image_audio_to_clip(image_path: str, audio_path: str, output_path: str):
    """
    ffmpeg: 이미지 + 오디오 → mp4 클립
    오디오 길이 + 1초를 영상 길이로 사용
    """
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        "-t", str(get_audio_duration(audio_path) + 0.8),
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr[-500:]}")


def get_audio_duration(audio_path: str) -> float:
    """ffprobe로 오디오 길이(초) 반환"""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except Exception:
        return 5.0


def combine_audio(audio1: str, audio2: str, output: str, gap_sec: float = 0.5):
    """두 오디오 파일을 침묵 gap과 함께 이어붙이기"""
    silence = output.replace(".mp3", "_silence.mp3")
    # gap용 침묵 생성
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"anullsrc=r=24000:cl=mono",
        "-t", str(gap_sec),
        "-c:a", "libmp3lame", silence
    ], capture_output=True)

    # concat list 파일
    list_file = output + ".txt"
    with open(list_file, "w") as f:
        for p in [audio1, silence, audio2]:
            f.write(f"file '{os.path.abspath(p)}'\n")

    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", list_file, "-c", "copy", output
    ], capture_output=True)

    os.remove(list_file)
    if os.path.exists(silence):
        os.remove(silence)


def concat_clips(clip_paths: list, output_path: str):
    """여러 mp4 클립을 하나로 이어붙이기"""
    list_file = output_path + "_list.txt"
    with open(list_file, "w") as f:
        for p in clip_paths:
            f.write(f"file '{os.path.abspath(p)}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    os.remove(list_file)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg concat error: {result.stderr[-500:]}")


# ── YouTube 업로드 ────────────────────────────────────────────────────────────
SCRIPTS_DIR = Path(__file__).parent
TOKEN_PATH  = SCRIPTS_DIR / 'youtube_token.pickle'
SCOPES      = ['https://www.googleapis.com/auth/youtube.upload']


def find_client_secrets() -> str:
    patterns = [
        str(SCRIPTS_DIR / 'client_secret*.json'),
        str(SCRIPTS_DIR / 'client_secrets.json'),
    ]
    for pattern in patterns:
        files = glob.glob(pattern)
        if files:
            return files[0]
    return None


def get_youtube_credentials():
    import pickle
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if TOKEN_PATH.exists():
        with open(TOKEN_PATH, 'rb') as f:
            creds = pickle.load(f)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            secrets = find_client_secrets()
            if not secrets:
                raise FileNotFoundError('client_secret*.json not found in scripts/')
            flow = InstalledAppFlow.from_client_secrets_file(secrets, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, 'wb') as f:
            pickle.dump(creds, f)

    return creds


def upload_to_youtube(video_path: str, trend: dict) -> str:
    """YouTube에 숏츠 업로드. 반환값: video_id"""
    import pickle
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    log("upload", "YouTube 업로드 준비 중...", progress=95)

    creds = get_youtube_credentials()
    youtube = build('youtube', 'v3', credentials=creds)

    title    = trend.get("title", "Trend Eng 영어 학습")
    category = trend.get("category", "")
    trend_type = trend.get("type", "news")

    # 제목 (최대 100자)
    yt_title = f"[영어 {trend_type.upper()}] {title}"[:100]

    # 설명
    sentences = trend.get("sentences", [])
    sentence_list = "\n".join(
        f"{i}. {s.get('en','')}" for i, s in enumerate(sentences, 1)
    )
    description = (
        f"📰 {title}\n\n"
        f"🎯 오늘의 학습 문장\n{sentence_list}\n\n"
        f"✅ Trend Eng - AI 영어 학습 플랫폼\n"
        f"트렌드 뉴스와 팝송으로 배우는 실용 영어!\n\n"
        f"#영어공부 #영어학습 #Shorts #TrendEng #영어 #{category}"
    )

    tags = ["영어", "영어공부", "영어학습", "Shorts", "TrendEng",
            "영어단어", "영어문법", "실용영어", category]

    body = {
        "snippet": {
            "title": yt_title,
            "description": description,
            "tags": [t for t in tags if t],
            "categoryId": "27",  # Education
            "defaultLanguage": "ko",
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
            "madeForKids": False,
        }
    }

    media = MediaFileUpload(video_path, mimetype="video/mp4",
                            chunksize=1024 * 1024 * 5, resumable=True)
    request = youtube.videos().insert(
        part=",".join(body.keys()), body=body, media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = 95 + int(status.progress() * 4)
            log("upload", f"업로드 중... {int(status.progress()*100)}%", progress=pct)

    video_id = response["id"]
    yt_url = f"https://youtu.be/{video_id}"
    log("uploaded", f"YouTube 업로드 완료! {yt_url}", progress=100,
        youtube_id=video_id, url=yt_url)
    return video_id


# ── API에서 트렌드 데이터 읽기 ────────────────────────────────────────────────
BASE_URL = "https://aieng.duckdns.org"


def api_get(path: str) -> dict:
    url = BASE_URL + path
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def fetch_trend(trend_id: int, db_path: str = None) -> dict:
    data = api_get(f"/api/trends/by-id/{trend_id}")
    trend = data.get("trend") or data
    if not trend:
        raise ValueError(f"Trend ID {trend_id} not found")
    if isinstance(trend.get("sentences"), str):
        trend["sentences"] = json.loads(trend["sentences"] or "[]")
    return trend


def fetch_latest_trends(limit: int = 3) -> list:
    data = api_get("/api/trends/saved")
    trends = data.get("trends", [])
    return trends[:limit]


# ── 메인 파이프라인 ───────────────────────────────────────────────────────────
async def generate(trend_id: int, output_base: str, db_path: str = None) -> tuple:
    log("start", f"트렌드 #{trend_id} 숏츠 생성 시작", progress=0)

    # 1. DB 조회
    trend = fetch_trend(trend_id, db_path)
    sentences = trend["sentences"]
    category = trend.get("category") or trend.get("type") or "NEWS"
    title = trend.get("title", "")
    total = len(sentences)
    log("fetch", f"문장 {total}개 로드: {title}", progress=5)

    # 2. 출력 디렉토리 준비
    out_dir = Path(output_base) / str(trend_id)
    audio_dir = out_dir / "audio"
    img_dir = out_dir / "images"
    clip_dir = out_dir / "clips"
    for d in [audio_dir, img_dir, clip_dir]:
        d.mkdir(parents=True, exist_ok=True)

    clip_paths = []
    import edge_tts  # import here to give a clear error if not installed

    for i, sentence in enumerate(sentences, 1):
        pct = int(5 + (i / total) * 85)
        log("processing", f"문장 {i}/{total} 처리 중...", progress=pct)

        # ── TTS 생성 ──────────────────────────────
        en_audio = str(audio_dir / f"{i:02d}_en.mp3")
        ko_audio = str(audio_dir / f"{i:02d}_ko.mp3")
        combined_audio = str(audio_dir / f"{i:02d}_combined.mp3")

        en_text = sentence.get("en", "")
        ko_text = sentence.get("ko", "")
        # 설명 첫 문장만 TTS (너무 길면 짤라냄)
        expl_text = sentence.get("explanation", "")
        expl_short = expl_text.split("!")[0] if "!" in expl_text else expl_text[:100]

        speak_en = edge_tts.Communicate(en_text, VOICE_EN)
        await speak_en.save(en_audio)

        ko_speak_text = f"{ko_text}. {expl_short}"
        speak_ko = edge_tts.Communicate(ko_speak_text, VOICE_KO)
        await speak_ko.save(ko_audio)

        combine_audio(en_audio, ko_audio, combined_audio, gap_sec=0.6)

        # ── 카드 이미지 생성 ───────────────────────
        card = make_card(i, total, sentence, category, title)
        img_path = str(img_dir / f"{i:02d}.png")
        card.save(img_path)

        # ── 클립 생성 ──────────────────────────────
        clip_path = str(clip_dir / f"{i:02d}.mp4")
        image_audio_to_clip(img_path, combined_audio, clip_path)
        clip_paths.append(clip_path)

    # 3. 최종 영상 합치기
    log("concat", "클립 합치는 중...", progress=92)
    final_path = str(out_dir / "final.mp4")
    concat_clips(clip_paths, final_path)

    log("done", f"완료! {final_path}", progress=100, output=final_path)
    return final_path, trend


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]

    if not args:
        log("error", "Usage: python generate_shorts.py <trend_id> [--upload]")
        sys.exit(1)

    trend_id    = int(args[0])
    do_upload   = '--upload' in flags
    script_dir  = Path(__file__).parent
    project_dir = script_dir.parent
    output_base = str(project_dir / "output" / "shorts")

    final_path, trend = asyncio.run(generate(trend_id, output_base, db_path=None))

    if do_upload:
        upload_to_youtube(final_path, trend)


if __name__ == "__main__":
    main()
