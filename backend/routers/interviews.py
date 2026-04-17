import json
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..database import get_connection
from ..services.ollama_service import chat_stream
from ..services.interview_service import build_system_prompt

router = APIRouter(prefix="/api/interviews", tags=["interviews"])

RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "recordings")


class SendMessageRequest(BaseModel):
    content: str
    section_index: int = 0


@router.post("/{session_id}/message")
async def send_message(session_id: str, req: SendMessageRequest):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        session = dict(row)
        session["interview_plan"] = json.loads(session["interview_plan"] or "[]")

        history = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        ).fetchall()

        # Save candidate message
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO messages (session_id, role, content, section_index, message_type, created_at) VALUES (?,?,?,?,?,?)",
            (session_id, "candidate", req.content, req.section_index, "answer", now),
        )
        conn.commit()
    finally:
        conn.close()

    system_prompt = build_system_prompt(session, session["interview_plan"])

    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        role = "user" if h["role"] == "candidate" else "assistant"
        messages.append({"role": role, "content": h["content"]})
    messages.append({"role": "user", "content": req.content})

    full_response = []

    async def event_stream():
        async for chunk in chat_stream(messages):
            full_response.append(chunk)
            yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"

        complete_text = "".join(full_response)
        save_interviewer_message(session_id, complete_text, req.section_index)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{session_id}/start")
async def start_interview(session_id: str):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        session = dict(row)
        session["interview_plan"] = json.loads(session["interview_plan"] or "[]")
    finally:
        conn.close()

    system_prompt = build_system_prompt(session, session["interview_plan"])
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Please start the interview."},
    ]

    full_response = []

    async def event_stream():
        async for chunk in chat_stream(messages):
            full_response.append(chunk)
            yield f"data: {json.dumps({'type': 'content', 'data': chunk})}\n\n"

        complete_text = "".join(full_response)
        save_interviewer_message(session_id, complete_text, 0, "question")
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{session_id}/audio")
async def upload_audio(
    session_id: str,
    audio: UploadFile = File(...),
    message_id: int = Form(None),
):
    session_dir = os.path.join(RECORDINGS_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.webm"
    filepath = os.path.join(session_dir, filename)

    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    rel_path = f"recordings/{session_id}/{filename}"

    if message_id:
        conn = get_connection()
        try:
            conn.execute("UPDATE messages SET audio_path = ? WHERE id = ?", (rel_path, message_id))
            conn.commit()
        finally:
            conn.close()

    return {"audio_path": rel_path}


def save_interviewer_message(session_id: str, content: str, section_index: int, msg_type: str = "feedback"):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO messages (session_id, role, content, section_index, message_type, created_at) VALUES (?,?,?,?,?,?)",
            (session_id, "interviewer", content, section_index, msg_type, now),
        )
        conn.commit()
    finally:
        conn.close()
