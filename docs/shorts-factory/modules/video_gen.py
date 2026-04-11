"""
video_gen.py — CogVideoX-2B로 이미지 → 5초 영상 클립 생성

사전 준비:
  pip install diffusers transformers accelerate torch
  모델은 첫 실행 시 HuggingFace에서 자동 다운로드 (~6GB)
  또는 수동 다운로드: THUDM/CogVideoX-2b
"""

import torch
from diffusers import CogVideoXImageToVideoPipeline
from diffusers.utils import load_image, export_to_video
from pathlib import Path

_pipe = None


def _get_pipeline():
    """파이프라인 싱글톤 — 최초 1회만 로드"""
    global _pipe
    if _pipe is None:
        print("      CogVideoX-2B 모델 로딩 중... (최초 1회)")
        _pipe = CogVideoXImageToVideoPipeline.from_pretrained(
            "THUDM/CogVideoX-2b",
            torch_dtype=torch.float16
        )
        _pipe.enable_model_cpu_offload()  # VRAM 절약
        _pipe.vae.enable_tiling()          # 메모리 효율화
        _pipe.vae.enable_slicing()
    return _pipe


def image_to_video(image_path: str, prompt: str, output_path: str) -> str:
    """
    정지 이미지를 5초 영상 클립으로 변환

    Args:
        image_path: 입력 PNG 경로 (9:16 비율 권장)
        prompt: 영상 움직임 묘사 프롬프트
        output_path: 출력 MP4 경로

    Returns:
        str: 저장된 MP4 경로
    """
    pipe = _get_pipeline()
    image = load_image(image_path)

    # 9:16 비율에 맞게 리사이즈 (CogVideoX는 480×720 또는 720×1280 지원)
    image = image.resize((480, 854))

    video_prompt = (
        f"{prompt}, "
        "subtle camera movement, slow zoom in, "
        "cinematic motion, atmospheric"
    )

    output = pipe(
        prompt=video_prompt,
        image=image,
        num_videos_per_prompt=1,
        num_inference_steps=25,
        num_frames=49,       # ~5초 @ 8fps
        guidance_scale=6.0,
        generator=torch.Generator("cuda").manual_seed(42),
    )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    export_to_video(output.frames[0], output_path, fps=8)
    return output_path


def image_to_video_kenburns(image_path: str, output_path: str,
                             duration: int = 5) -> str:
    """
    CogVideoX 없이 FFmpeg Ken Burns 효과로 영상 생성 (폴백)

    Args:
        image_path: 입력 PNG 경로
        output_path: 출력 MP4 경로
        duration: 영상 길이 (초)
    """
    import subprocess
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1',
        '-i', image_path,
        '-vf', (
            f"zoompan=z='min(zoom+0.0015,1.3)':"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':"
            f"d={duration*25}:s=1080x1920:fps=25"
        ),
        '-t', str(duration),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        output_path
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path
