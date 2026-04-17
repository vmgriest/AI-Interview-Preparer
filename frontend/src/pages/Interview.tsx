import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, streamStart, streamMessage, completeSession, uploadAudio } from "../api/client";
import type { Session, Message } from "../types";
import ChatMessage from "../components/ChatMessage";
import VoiceInput from "../components/VoiceInput";
import InterviewProgress from "../components/InterviewProgress";
import { CheckCircle, Loader2, ArrowLeft, Send } from "lucide-react";

interface UiMessage {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  streaming?: boolean;
}

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      setSession(s);
      // If session has existing messages, load them
      if (s.messages && s.messages.length > 0) {
        setMessages(
          s.messages.map((m: Message) => ({
            id: String(m.id),
            role: m.role,
            content: m.content,
          }))
        );
        setStarted(true);
        if (s.completed_at) setDone(true);
      }
    });
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendChunk = useCallback((id: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m))
    );
  }, []);

  const finalizeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)));
  }, []);

  async function startInterview() {
    if (!sessionId || busy) return;
    setBusy(true);
    setStarted(true);
    const msgId = crypto.randomUUID();
    setMessages([{ id: msgId, role: "interviewer", content: "", streaming: true }]);
    try {
      for await (const chunk of streamStart(sessionId)) {
        appendChunk(msgId, chunk);
      }
      finalizeMessage(msgId);
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  async function sendMessage(text: string, audioBlob?: Blob) {
    if (!sessionId || busy || !text.trim()) return;
    setBusy(true);
    setInput("");

    const candidateId = crypto.randomUUID();
    const interviewerId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: candidateId, role: "candidate", content: text },
      { id: interviewerId, role: "interviewer", content: "", streaming: true },
    ]);

    // Upload audio in background if provided
    if (audioBlob) {
      uploadAudio(sessionId, audioBlob).catch(console.error);
    }

    try {
      for await (const chunk of streamMessage(sessionId, text, currentSection)) {
        appendChunk(interviewerId, chunk);
      }
      finalizeMessage(interviewerId);
    } catch (e) {
      setError(String(e));
    }

    // Detect section transition by counting messages
    setMessages((prev) => {
      const candidateCount = prev.filter((m) => m.role === "candidate").length;
      const plan = session?.interview_plan ?? [];
      let total = 0;
      for (let i = 0; i <= currentSection && i < plan.length; i++) {
        total += plan[i].questions.length;
      }
      if (candidateCount >= total && currentSection < (plan.length - 1)) {
        setCurrentSection((s) => s + 1);
      }
      return prev;
    });

    setBusy(false);
  }

  async function handleFinish() {
    if (!sessionId) return;
    await completeSession(sessionId);
    setDone(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">
            {session.position}
            {session.company ? ` · ${session.company}` : ""}
          </p>
          <p className="text-slate-400 text-xs">{session.user_name}</p>
        </div>
        {!done && started && (
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <CheckCircle size={16} />
            Finish
          </button>
        )}
        {done && (
          <button
            onClick={() => navigate(`/session/${sessionId}`)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Summary
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-slate-800 bg-slate-900 overflow-y-auto shrink-0">
          <InterviewProgress
            sections={session.interview_plan}
            currentSection={currentSection}
            messageCount={messages.filter((m) => m.role === "candidate").length}
          />
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="mx-4 mt-3 text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!started && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <p className="text-slate-400">
                  Ready to begin your mock interview for{" "}
                  <span className="text-white font-medium">{session.position}</span>?
                </p>
                <p className="text-slate-500 text-sm">
                  {session.interview_plan.length} sections · ~
                  {session.interview_plan.reduce((a, s) => a + s.questions.length, 0)} questions
                </p>
                <button onClick={startInterview} disabled={busy} className="btn-primary">
                  {busy ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                  Begin Interview
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {done && (
              <div className="flex justify-center pt-4">
                <div className="card text-center space-y-3 max-w-sm">
                  <CheckCircle size={32} className="text-emerald-400 mx-auto" />
                  <p className="font-semibold text-white">Interview Complete!</p>
                  <button
                    onClick={() => navigate(`/session/${sessionId}`)}
                    className="btn-primary w-full"
                  >
                    View Full Summary
                  </button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {started && !done && (
            <div className="border-t border-slate-800 bg-slate-900 px-4 py-3 shrink-0">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <VoiceInput
                  onTranscript={(text) => setInput((prev) => prev + text)}
                  onAudioReady={(blob) => {
                    if (input.trim()) sendMessage(input, blob);
                  }}
                  disabled={busy}
                />
                <textarea
                  ref={textareaRef}
                  className="input flex-1 resize-none min-h-[44px] max-h-36 leading-tight py-3"
                  placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={busy}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={busy || !input.trim()}
                  className="btn-primary px-3 py-3 flex items-center justify-center"
                >
                  {busy ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
