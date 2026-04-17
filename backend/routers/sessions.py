import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..database import get_connection
from ..services.interview_service import analyze_job_description, build_interview_plan

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    user_name: str
    position: str
    company: str = ""
    job_description: str = ""


@router.post("")
async def create_session(req: CreateSessionRequest):
    job_analysis = await analyze_job_description(req.job_description)
    interview_plan = build_interview_plan(job_analysis)

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO sessions
               (id, user_name, position, company, job_description, interview_plan, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                session_id,
                req.user_name,
                req.position,
                req.company,
                req.job_description,
                json.dumps(interview_plan),
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "id": session_id,
        "user_name": req.user_name,
        "position": req.position,
        "company": req.company,
        "interview_plan": interview_plan,
        "job_analysis": job_analysis,
        "created_at": now,
    }


@router.get("")
def list_sessions():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, user_name, position, company, created_at, completed_at, overall_score FROM sessions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/{session_id}")
def get_session(session_id: str):
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")

        session = dict(row)
        session["interview_plan"] = json.loads(session["interview_plan"] or "[]")

        messages = conn.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        ).fetchall()
        session["messages"] = [dict(m) for m in messages]

        return session
    finally:
        conn.close()


@router.patch("/{session_id}/complete")
def complete_session(session_id: str, overall_score: float = None):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE sessions SET completed_at = ?, overall_score = ? WHERE id = ?",
            (now, overall_score, session_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"status": "ok"}


@router.delete("/{session_id}")
def delete_session(session_id: str):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
    finally:
        conn.close()
    return {"status": "deleted"}
