import type { CreateSessionPayload, Session } from "../types";

const BASE = "/api";

export async function createSession(payload: CreateSessionPayload): Promise<Session> {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessions(): Promise<Session[]> {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" });
}

export async function completeSession(id: string, score?: number): Promise<void> {
  await fetch(`${BASE}/sessions/${id}/complete?overall_score=${score ?? ""}`, {
    method: "PATCH",
  });
}

export async function uploadAudio(sessionId: string, blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  const res = await fetch(`${BASE}/interviews/${sessionId}/audio`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.audio_path;
}

export async function* streamStart(sessionId: string): AsyncGenerator<string> {
  yield* streamSSE(`${BASE}/interviews/${sessionId}/start`, "POST", {});
}

export async function* streamMessage(
  sessionId: string,
  content: string,
  sectionIndex: number
): AsyncGenerator<string> {
  yield* streamSSE(`${BASE}/interviews/${sessionId}/message`, "POST", {
    content,
    section_index: sectionIndex,
  });
}

async function* streamSSE(url: string, method: string, body: object): AsyncGenerator<string> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const event = JSON.parse(raw);
        if (event.type === "content") yield event.data as string;
        if (event.type === "done") return;
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
