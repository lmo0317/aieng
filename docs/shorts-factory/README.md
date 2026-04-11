# Shorts Factory — 명대사 유튜브 쇼츠 자동 생성 시스템

명대사 학습 DB 데이터를 기반으로 유튜브 쇼츠를 로컬에서 완전 자동 생성하는 파이프라인.

## 환경

- GPU: RTX 5080 (16GB VRAM)
- OS: Windows 11
- 데이터 소스: `db/database.sqlite` (punchline 데이터)

---

## 전체 아키텍처

```
[명대사 DB]
     ↓
[① Ollama/Qwen2.5-14B] → 장면 묘사 프롬프트 생성
     ↓
[② ComfyUI + Flux.1 Schnell] → 배경 이미지 생성 (9:16)
     ↓
[③ CogVideoX-2B] → 이미지 → 5초 영상 클립
     ↓
[④ CosyVoice2 (Qwen TTS)] → 영어 대사 음성 생성
     ↓
[⑤ FFmpeg] → 영상 + 텍스트 오버레이 + 음성 + BGM 합성
     ↓
[⑥ YouTube Data API] → 자동 업로드 (선택)
     ↓
[⑦ n8n] → 전체 스케줄 자동화
```

---

## 로컬 모델 스택

| 역할 | 모델 | VRAM 사용 | 처리 속도 |
|---|---|---|---|
| 프롬프트 생성 | Ollama + Qwen2.5-14B | ~10GB | ~3초 |
| 이미지 생성 | ComfyUI + Flux.1 Schnell | ~12GB | ~3~5초/장 |
| 이미지→영상 | CogVideoX-2B | ~6GB | ~90초/5초 클립 |
| TTS | CosyVoice2 | ~2GB | ~2초 |
| 영상 합성 | FFmpeg | CPU | ~10초 |

> Flux + CogVideoX 동시 실행은 VRAM 초과 → 순차 실행으로 설계

---

## 쇼츠 레이아웃 (1080×1920, 30초)

```
┌────────────────────┐
│   영화 제목 배지    │  0~30초 상단 고정
├────────────────────┤
│                    │
│   AI 생성 배경영상  │  전체 배경
│                    │
│  "영어 명대사"      │  1.5초 후 등장
│                    │
│  "한국어 번역"      │  3.0초 후 등장
│                    │
│  단어1 단어2 단어3  │  5.0초 후 등장
│                    │
├────────────────────┤
│  Trend Eng 로고    │  하단 고정
└────────────────────┘
```

---

## 실행 시간 (RTX 5080 기준)

```
명대사 1개 기준:
  Qwen 프롬프트 생성    ~3초
  Flux.1 이미지 생성    ~5초
  CogVideoX 영상 변환   ~90초
  CosyVoice TTS         ~2초
  FFmpeg 최종 합성      ~10초
  ────────────────────────────
  합계                  ~110초 / 개

영화 1편 (5개 명대사):
  총 소요 시간          ~9분
```

---

## 설치

```bash
# 1. ComfyUI + Flux.1 Schnell
git clone https://github.com/comfyanonymous/ComfyUI
# flux1-schnell.safetensors → ComfyUI/models/checkpoints/

# 2. Ollama + Qwen2.5
winget install Ollama
ollama pull qwen2.5:14b

# 3. CogVideoX
pip install diffusers transformers accelerate torch

# 4. CosyVoice2
git clone https://github.com/FunAudioLLM/CosyVoice
pip install -r CosyVoice/requirements.txt
# 모델 다운로드: pretrained_models/CosyVoice2-0.5B

# 5. FFmpeg
winget install ffmpeg

# 6. n8n (자동화 워크플로우)
npm install -g n8n
n8n start
```

---

## 프로젝트 구조

```
shorts-factory/
├── orchestrator.py        # 전체 파이프라인 실행 진입점
├── config.yaml            # 경로 및 모델 설정
├── requirements.txt       # Python 의존성
├── modules/
│   ├── prompt_gen.py      # Ollama/Qwen으로 장면 프롬프트 생성
│   ├── image_gen.py       # ComfyUI WebSocket API 호출
│   ├── video_gen.py       # CogVideoX 이미지→영상 변환
│   ├── tts_gen.py         # CosyVoice2 TTS 음성 생성
│   ├── compositor.py      # FFmpeg 최종 합성
│   └── uploader.py        # YouTube Data API 업로드
├── assets/
│   ├── bgm/               # 로열티프리 배경음악 (.mp3)
│   ├── fonts/
│   │   ├── Pretendard-Bold.ttf
│   │   ├── Pretendard-Regular.ttf
│   │   └── DMSans-Bold.ttf
│   └── templates/         # FFmpeg 필터 템플릿
└── output/
    └── {Movie_Title}/
        ├── scene_0.png    # 생성된 배경 이미지
        ├── clip_0.mp4     # CogVideoX 영상 클립
        ├── tts_0.wav      # TTS 음성
        └── shorts_1.mp4   # 최종 쇼츠
```

---

## 실행 방법

```bash
# 특정 작품의 쇼츠 생성
python orchestrator.py "Movie: Catch Me If You Can"

# 최신 등록된 명대사로 자동 생성
python orchestrator.py
```

---

## n8n 자동화 워크플로우

```
Cron Trigger (매일 09:00)
    → HTTP Request: GET /api/punchline/saved?limit=1
    → Execute Command: python orchestrator.py "{title}"
    → IF: output/*.mp4 파일 존재
        → YouTube Upload (OAuth2)
        → Telegram Bot: "✅ {title} 쇼츠 5개 업로드 완료\n{youtube_links}"
```

---

## 모듈별 코드

자세한 구현 코드는 각 모듈 파일 참조:

- [prompt_gen.py](./modules/prompt_gen.py)
- [image_gen.py](./modules/image_gen.py)
- [video_gen.py](./modules/video_gen.py)
- [tts_gen.py](./modules/tts_gen.py)
- [compositor.py](./modules/compositor.py)
- [orchestrator.py](./orchestrator.py)
