# AI Interview Preparer

A fully local mock interview app powered by [Ollama](https://ollama.com). No cloud APIs, no data leaving your machine.

---

## Features

- **Structured interviews** — 5 base sections every time: Introduction, Behavioral, OOP, Data Structures, Algorithms
- **Job-specific questions** — paste a job description and the AI generates tailored questions
- **Voice input** — record your answers with the mic button; Whisper transcribes locally
- **AI voice** — the interviewer reads questions aloud via browser TTS with selectable voices
- **Feedback on every answer** — strengths, improvements, and a score out of 10
- **Session history** — every interview is saved with full transcript and audio recordings
- **100% local** — runs on Ollama + Python + your browser, no internet required after setup

---

## Requirements

- [Python 3.10+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Ollama](https://ollama.com) with at least one model pulled

```bash
ollama pull llama3:8b
```

---

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
```

---

## Running

Open **two terminals** from the project root.

**Terminal 1 — Backend**

```bash
# Windows
.\backend\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000

# macOS / Linux
source backend/venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

## Voice Input

Voice transcription uses [faster-whisper](https://github.com/SYSTRAN/faster-whisper) running locally on CPU.

- The `small` Whisper model (~460 MB) downloads automatically on first use
- Click the **mic button** to start recording, click again to stop and transcribe
- Requires your browser to have microphone access granted

> **Windows tip:** Go to **Settings → Privacy & Security → Microphone** and ensure Chrome has access.

---

## Interview Structure

| Section | Always Included |
|---|---|
| Introduction & Background | ✅ |
| Behavioral & Situational | ✅ |
| Object-Oriented Programming | ✅ |
| Data Structures | ✅ |
| Algorithms & Complexity | ✅ |
| Role-Specific (from job description) | When JD is provided |

---

## Project Structure

```
AI-Interview-Preparer/
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── database.py              # SQLite setup
│   ├── routers/
│   │   ├── sessions.py          # Session CRUD
│   │   └── interviews.py        # Chat streaming + transcription
│   └── services/
│       ├── ollama_service.py    # Ollama streaming client
│       ├── interview_service.py # Prompts + interview plan builder
│       └── transcription_service.py  # Whisper transcription
├── frontend/
│   └── src/
│       ├── pages/               # Home, Setup, Interview, History
│       └── components/          # ChatMessage, VoiceInput, Progress
└── README.md
```

---

## Changing the AI Model

Edit `DEFAULT_MODEL` in `backend/services/ollama_service.py`:

```python
DEFAULT_MODEL = "llama3:8b"   # change to any model you have pulled
```

Any model available via `ollama list` will work.
