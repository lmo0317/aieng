"""
tts_gen.py — CosyVoice2 (Qwen TTS 계열)로 영어 대사 음성 생성

사전 준비:
  git clone https://github.com/FunAudioLLM/CosyVoice
  cd CosyVoice && pip install -r requirements.txt
  # 모델 다운로드 (modelscope 또는 HuggingFace)
  # pretrained_models/CosyVoice2-0.5B/

대안 (CosyVoice 설치 어려울 때):
  - edge-tts: pip install edge-tts  (Microsoft Edge TTS, 무료)
  - pyttsx3: pip install pyttsx3    (오프라인, 품질 낮음)
"""

import sys
import os
import torchaudio
from pathlib import Path

# CosyVoice 경로 설정 — 실제 경로로 수정 필요
COSYVOICE_PATH = os.path.expanduser("~/CosyVoice")
MODEL_PATH = os.path.join(COSYVOICE_PATH, "pretrained_models/CosyVoice2-0.5B")

_cosyvoice = None


def _get_model():
    global _cosyvoice
    if _cosyvoice is None:
        sys.path.insert(0, COSYVOICE_PATH)
        from cosyvoice.cli.cosyvoice import CosyVoice2
        print("      CosyVoice2 모델 로딩 중...")
        _cosyvoice = CosyVoice2(MODEL_PATH, load_jit=True, load_trt=False)
    return _cosyvoice


def generate_tts(text: str, output_path: str,
                 speed: float = 0.9) -> str:
    """
    영어 텍스트를 음성 파일로 변환

    Args:
        text: 영어 대사 원문
        output_path: 저장할 .wav 파일 경로
        speed: 발화 속도 (0.8~1.0 권장, 학습용은 0.9)

    Returns:
        str: 저장된 파일 경로
    """
    try:
        model = _get_model()
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        audio_chunks = []
        for chunk in model.inference_sft(
            text,
            spk_id='en-us',   # 영어 화자
            stream=False,
            speed=speed
        ):
            audio_chunks.append(chunk['tts_speech'])

        if audio_chunks:
            import torch
            audio = torch.cat(audio_chunks, dim=-1)
            torchaudio.save(output_path, audio, 22050)
        return output_path

    except Exception as e:
        print(f"      ⚠️ CosyVoice TTS 실패, edge-tts로 폴백: {e}")
        return generate_tts_edge(text, output_path)


def generate_tts_edge(text: str, output_path: str) -> str:
    """
    edge-tts 폴백 (pip install edge-tts)
    Microsoft Edge 음성 엔진 사용 — 인터넷 필요
    """
    import asyncio
    import edge_tts

    mp3_path = output_path.replace('.wav', '.mp3')

    async def _run():
        communicate = edge_tts.Communicate(
            text,
            voice="en-US-AndrewNeural",  # 자연스러운 남성 음성
            rate="-10%"                   # 약간 느리게
        )
        await communicate.save(mp3_path)

    asyncio.run(_run())

    # mp3 → wav 변환
    import subprocess
    subprocess.run(
        ['ffmpeg', '-y', '-i', mp3_path, output_path],
        check=True, capture_output=True
    )
    os.remove(mp3_path)
    return output_path
