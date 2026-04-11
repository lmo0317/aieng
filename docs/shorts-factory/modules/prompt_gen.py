"""
prompt_gen.py — Ollama + Qwen2.5-14B로 Flux 이미지 생성용 장면 프롬프트 생성
"""

import ollama


SYSTEM_PROMPT = """You are a cinematic prompt engineer for AI image generation.
Convert movie/drama quote context into a detailed Flux image generation prompt.
Rules:
- NO real actor faces or character names
- Focus on atmosphere, location, lighting, mood
- Always output in English
- Vertical composition (9:16) optimized
- End with: cinematic, film grain, anamorphic lens, 4k
"""


def generate_scene_prompt(quote: dict) -> str:
    """
    명대사 데이터를 받아 Flux.1 이미지 생성용 영어 프롬프트 반환

    Args:
        quote: {'title': str, 'en': str, 'ko': str, 'explanation': str}

    Returns:
        str: Flux 프롬프트
    """
    user_msg = f"""Movie/Drama: {quote['title']}
Quote: {quote['en']}
Context: {quote.get('explanation', '')[:300]}

Generate a cinematic Flux image prompt for this scene.
No real faces. Focus on atmosphere and emotion."""

    try:
        response = ollama.chat(
            model='qwen2.5:14b',
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': user_msg}
            ],
            options={'temperature': 0.7, 'num_predict': 200}
        )
        prompt = response['message']['content'].strip()
        # 불필요한 설명 제거 — 첫 번째 줄 또는 마지막 줄 활용
        lines = [l.strip() for l in prompt.split('\n') if l.strip()]
        return ' '.join(lines)

    except Exception as e:
        # Ollama 실패 시 기본 프롬프트 반환
        print(f"      ⚠️ Ollama 프롬프트 생성 실패: {e}")
        return (
            f"cinematic movie scene, dramatic atmosphere, "
            f"emotional storytelling, dark moody lighting, "
            f"vertical composition 9:16, film grain, anamorphic lens, 4k"
        )
