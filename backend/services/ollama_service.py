import httpx
import json
from typing import AsyncGenerator

OLLAMA_BASE = "http://localhost:11434"
DEFAULT_MODEL = "llama3:8b"


async def chat_stream(messages: list[dict], model: str = DEFAULT_MODEL) -> AsyncGenerator[str, None]:
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {"temperature": 0.7, "num_ctx": 8192},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", f"{OLLAMA_BASE}/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                data = json.loads(line)
                if data.get("message", {}).get("content"):
                    yield data["message"]["content"]
                if data.get("done"):
                    break


async def chat_once(messages: list[dict], model: str = DEFAULT_MODEL) -> str:
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.3, "num_ctx": 4096},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        response.raise_for_status()
        return response.json()["message"]["content"]


async def list_models() -> list[str]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{OLLAMA_BASE}/api/tags")
        resp.raise_for_status()
        return [m["name"] for m in resp.json().get("models", [])]
