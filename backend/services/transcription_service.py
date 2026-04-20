import os
import tempfile
from faster_whisper import WhisperModel

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        # "tiny" downloads ~40MB on first use, runs on CPU
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model


# Common Whisper hallucinations on short/quiet audio
_HALLUCINATIONS = {
    "you", "you.", "You", "You.", "thank you.", "thank you",
    "Thanks.", "Thanks for watching.", "Thank you for watching.",
    ".", "..", "...", " ", "",
}


def transcribe_bytes(audio_bytes: bytes, suffix: str = ".webm") -> str:
    model = get_model()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        segments, _ = model.transcribe(
            tmp_path,
            language="en",
            beam_size=5,
            condition_on_previous_text=False,
            no_speech_threshold=0.5,
            temperature=0.0,
        )
        raw = [s.text.strip() for s in segments]
        print(f"[transcribe] raw segments: {raw}")
        filtered = [t for t in raw if t and t not in _HALLUCINATIONS and len(t) > 4]
        result = " ".join(filtered).strip()
        print(f"[transcribe] final: '{result}'")
        return result
    finally:
        os.unlink(tmp_path)
