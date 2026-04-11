"""
image_gen.py — ComfyUI WebSocket API를 통해 Flux.1 Schnell 이미지 생성

사전 준비:
  1. ComfyUI 실행: python main.py --listen
  2. flux1-schnell.safetensors → ComfyUI/models/checkpoints/
  3. t5xxl_fp8_e4m3fn.safetensors, clip_l.safetensors → ComfyUI/models/clip/
  4. ae.safetensors → ComfyUI/models/vae/
"""

import json
import uuid
import urllib.request
import urllib.parse
import websocket
import time
from pathlib import Path

COMFY_HOST = "127.0.0.1:8188"

# Flux.1 Schnell ComfyUI API 워크플로우
def build_workflow(prompt: str, width: int = 608, height: int = 1080) -> dict:
    return {
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "flux1-schnell.safetensors",
                "weight_dtype": "fp8_e4m3fn"
            }
        },
        "2": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
                "clip_name2": "clip_l.safetensors",
                "type": "flux"
            }
        },
        "3": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "ae.safetensors"}
        },
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": prompt, "clip": ["2", 0]}
        },
        "5": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1}
        },
        "6": {
            "class_type": "KSamplerSelect",
            "inputs": {"sampler_name": "euler"}
        },
        "7": {
            "class_type": "BasicScheduler",
            "inputs": {
                "scheduler": "simple",
                "steps": 4,
                "denoise": 1.0,
                "model": ["1", 0]
            }
        },
        "8": {
            "class_type": "SamplerCustomAdvanced",
            "inputs": {
                "noise": ["9", 0],
                "guider": ["10", 0],
                "sampler": ["6", 0],
                "sigmas": ["7", 0],
                "latent_image": ["5", 0]
            }
        },
        "9": {
            "class_type": "RandomNoise",
            "inputs": {"noise_seed": int(time.time()) % 1000000}
        },
        "10": {
            "class_type": "BasicGuider",
            "inputs": {"model": ["1", 0], "conditioning": ["4", 0]}
        },
        "11": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["8", 0], "vae": ["3", 0]}
        },
        "12": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "shorts_bg",
                "images": ["11", 0]
            }
        }
    }


def generate_image(prompt: str, output_path: str) -> str:
    """
    ComfyUI API로 Flux.1 Schnell 이미지 생성 후 output_path에 저장

    Args:
        prompt: Flux 이미지 생성 프롬프트
        output_path: 저장할 PNG 파일 경로

    Returns:
        str: 저장된 파일 경로
    """
    client_id = str(uuid.uuid4())
    workflow = build_workflow(prompt)

    # 프롬프트 제출
    data = json.dumps({"prompt": workflow, "client_id": client_id}).encode('utf-8')
    req = urllib.request.Request(
        f"http://{COMFY_HOST}/prompt",
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    response = urllib.request.urlopen(req)
    result = json.loads(response.read())
    prompt_id = result['prompt_id']

    # WebSocket으로 완료 대기
    ws = websocket.WebSocket()
    ws.connect(f"ws://{COMFY_HOST}/ws?clientId={client_id}")

    while True:
        msg = json.loads(ws.recv())
        if msg['type'] == 'executing':
            data = msg['data']
            if data.get('node') is None and data.get('prompt_id') == prompt_id:
                break  # 완료

    ws.close()

    # 생성된 이미지 다운로드
    history_url = f"http://{COMFY_HOST}/history/{prompt_id}"
    history = json.loads(urllib.request.urlopen(history_url).read())
    outputs = history[prompt_id]['outputs']

    for node_id, node_output in outputs.items():
        if 'images' in node_output:
            img_info = node_output['images'][0]
            img_url = (f"http://{COMFY_HOST}/view?"
                      f"filename={img_info['filename']}"
                      f"&subfolder={img_info['subfolder']}"
                      f"&type={img_info['type']}")
            img_data = urllib.request.urlopen(img_url).read()
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(img_data)
            return output_path

    raise RuntimeError("ComfyUI에서 이미지를 생성하지 못했습니다.")
