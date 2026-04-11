"""
orchestrator.py — Shorts Factory 전체 파이프라인 실행 진입점

사용법:
    python orchestrator.py                           # 최신 명대사 자동 선택
    python orchestrator.py "Movie: Catch Me If You Can"  # 특정 작품 지정
"""

import sys
import json
import sqlite3
import asyncio
from pathlib import Path
from modules import prompt_gen, image_gen, video_gen, tts_gen, compositor

DB_PATH = "../../db/database.sqlite"
OUTPUT_DIR = Path("output")
BGM_PATH = "assets/bgm/cinematic_light.mp3"


def get_punchlines(movie_title: str = None) -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    if movie_title:
        rows = conn.execute(
            "SELECT * FROM trends WHERE type='song' AND title=?",
            [movie_title]
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT * FROM trends
               WHERE type='song'
               AND (title LIKE 'Movie:%' OR title LIKE 'Animation:%'
                    OR title LIKE 'Drama:%' OR title LIKE 'Song:%')
               ORDER BY createdAt DESC LIMIT 1"""
        ).fetchall()

    conn.close()
    return [dict(r) for r in rows]


async def process_quote(item: dict, quote: dict, idx: int, work_dir: Path):
    print(f"  [{idx+1}] 처리 중: {quote['en'][:50]}...")

    # ① 장면 프롬프트 생성
    print(f"      → 프롬프트 생성...")
    scene_prompt = prompt_gen.generate_scene_prompt({
        'title': item['title'], **quote
    })

    # ② 이미지 생성 (ComfyUI + Flux.1 Schnell)
    img_path = str(work_dir / f"scene_{idx}.png")
    print(f"      → 이미지 생성: {img_path}")
    image_gen.generate_image(scene_prompt, img_path)

    # ③ 이미지 → 영상 (CogVideoX)
    vid_path = str(work_dir / f"clip_{idx}.mp4")
    print(f"      → 영상 변환: {vid_path} (약 90초 소요)")
    video_gen.image_to_video(img_path, scene_prompt, vid_path)

    # ④ TTS 음성 생성 (CosyVoice2)
    tts_path = str(work_dir / f"tts_{idx}.wav")
    print(f"      → TTS 생성: {tts_path}")
    tts_gen.generate_tts(quote['en'], tts_path)

    # ⑤ FFmpeg 최종 합성
    out_path = str(work_dir / f"shorts_{idx+1}.mp4")
    print(f"      → 합성 중: {out_path}")
    compositor.compose_short(
        vid_path, tts_path, BGM_PATH,
        {**quote, 'title': item['title']},
        out_path
    )

    print(f"      ✅ 완성: {out_path}")
    return out_path


async def make_shorts(movie_title: str = None):
    punchlines = get_punchlines(movie_title)

    if not punchlines:
        print("❌ 해당하는 명대사 데이터가 없습니다.")
        print("   Gemini에서 /punchline 스킬을 먼저 실행해주세요.")
        return

    results = []

    for item in punchlines:
        sentences = json.loads(item['sentences'])
        safe_title = item['title'].replace(':', '-').replace(' ', '_')
        work_dir = OUTPUT_DIR / safe_title
        work_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n🎬 {item['title']}")
        print(f"   명대사 {len(sentences)}개 → 쇼츠 {len(sentences)}개 생성 시작")
        print(f"   예상 소요 시간: 약 {len(sentences) * 2}분\n")

        for i, quote in enumerate(sentences):
            out_path = await process_quote(item, quote, i, work_dir)
            results.append(out_path)

        print(f"\n🎉 완료: {item['title']}")
        print(f"   생성된 쇼츠: {work_dir}/")
        for r in results:
            print(f"   - {r}")

    return results


if __name__ == "__main__":
    title = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(make_shorts(title))
