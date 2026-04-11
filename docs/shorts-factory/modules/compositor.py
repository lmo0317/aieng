"""
compositor.py — FFmpeg으로 영상 + 텍스트 오버레이 + 음성 + BGM 최종 합성

레이아웃 (1080×1920):
  상단 12%  : 영화 제목 배지
  중앙 35%  : 영어 명대사 (1.5초 후 등장)
  중앙 하단 : 한국어 번역 (3.0초 후 등장)
  하단 70%  : 핵심 어휘 카드 (5.0초 후 등장)
  최하단    : Trend Eng 워터마크
"""

import subprocess
import shutil
from pathlib import Path


def _escape(text: str) -> str:
    """FFmpeg drawtext용 특수문자 이스케이프"""
    return (text
            .replace('\\', '\\\\')
            .replace("'", "\\'")
            .replace(':', '\\:')
            .replace('[', '\\[')
            .replace(']', '\\]'))


def compose_short(
    video_path: str,
    tts_path: str,
    bgm_path: str,
    quote: dict,
    output_path: str,
    watermark: str = "Trend Eng"
) -> str:
    """
    최종 쇼츠 MP4 합성

    Args:
        video_path: 배경 영상 (.mp4)
        tts_path:   TTS 음성 (.wav)
        bgm_path:   배경음악 (.mp3)
        quote:      {'title', 'en', 'ko', 'voca'}
        output_path: 출력 파일 경로
        watermark:  하단 워터마크 텍스트

    Returns:
        str: 완성된 MP4 경로
    """
    title = _escape(quote.get('title', ''))
    en_text = _escape(quote.get('en', ''))
    ko_text = _escape(quote.get('ko', ''))

    # 어휘 3개만 표시
    voca_list = quote.get('voca', [])[:3]
    voca_text = _escape('  |  '.join(voca_list)) if voca_list else ''

    font_bold = "assets/fonts/Pretendard-Bold.ttf"
    font_regular = "assets/fonts/Pretendard-Regular.ttf"
    font_en = "assets/fonts/DMSans-Bold.ttf"

    # 폰트 파일 없으면 시스템 폰트 사용
    if not Path(font_bold).exists():
        font_bold = font_regular = font_en = ""

    def drawtext(text, fontfile, fontsize, color, y_expr,
                 enable_time=0, shadow=True, box=True):
        parts = [
            f"text='{text}'",
            f"fontsize={fontsize}",
            f"fontcolor={color}",
            f"x=(w-text_w)/2",
            f"y={y_expr}",
        ]
        if fontfile:
            parts.append(f"fontfile='{fontfile}'")
        if box:
            parts.extend(["box=1", "boxcolor=black@0.55", "boxborderw=14"])
        if shadow:
            parts.extend(["shadowcolor=black@0.6", "shadowx=2", "shadowy=2"])
        if enable_time > 0:
            parts.append(f"enable='gte(t,{enable_time})'")
        return "drawtext=" + ":".join(parts)

    # 필터 체인 구성
    filters = [
        # 배경 다크 오버레이 (텍스트 가독성)
        "colorchannelmixer=aa=0.55",
        # 영화 제목 (항상 표시)
        drawtext(title, font_bold, 34, "white@0.85",
                 "h*0.10", enable_time=0),
        # 영어 대사 (1.5초 후)
        drawtext(en_text, font_en, 50, "white",
                 "(h-text_h)/2 - 60", enable_time=1.5),
        # 한국어 번역 (3.0초 후)
        drawtext(ko_text, font_regular, 38, "#FFD700",
                 "(h-text_h)/2 + 80", enable_time=3.0),
    ]

    # 어휘 (5.0초 후)
    if voca_text:
        filters.append(
            drawtext(voca_text, font_regular, 28, "#A0E0FF",
                     "h*0.72", enable_time=5.0)
        )

    # 워터마크
    filters.append(
        drawtext(watermark, font_bold, 26, "white@0.5",
                 "h*0.92", enable_time=0, box=False, shadow=True)
    )

    vf = ",".join(filters)

    # BGM이 없으면 TTS만 사용
    has_bgm = Path(bgm_path).exists()

    if has_bgm:
        audio_filter = (
            "[1:a]volume=1.0[tts];"
            "[2:a]volume=0.15,afade=t=out:st=4:d=1[bgm];"
            "[tts][bgm]amix=inputs=2:duration=first[audio]"
        )
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-i', tts_path,
            '-i', bgm_path,
            '-vf', vf,
            '-filter_complex', audio_filter,
            '-map', '0:v', '-map', '[audio]',
            '-c:v', 'libx264', '-c:a', 'aac',
            '-s', '1080x1920', '-r', '30',
            '-shortest',
            output_path
        ]
    else:
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-i', tts_path,
            '-vf', vf,
            '-map', '0:v', '-map', '1:a',
            '-c:v', 'libx264', '-c:a', 'aac',
            '-s', '1080x1920', '-r', '30',
            '-shortest',
            output_path
        ]

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg 합성 실패:\n{result.stderr}")

    return output_path
