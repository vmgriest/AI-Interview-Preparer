import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, streamStart, streamMessage, completeSession, uploadAudio } from "../api/client";
import type { Session, Message } from "../types";
import ChatMessage from "../components/ChatMessage";
import VoiceInput from "../components/VoiceInput";
import InterviewProgress from "../components/InterviewProgress";
import { CheckCircle, Loader2, ArrowLeft, Send, Volume2, VolumeX } from "lucide-react";

interface UiMessage {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  streaming?: boolean;
}

// Strip markdown syntax before speaking
function stripMarkdown(text: string): string {
  return text
    .replace(/\[NEXT_SECTION\]/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/[✓△]/g, "")
    .replace(/\n{2,}/g, ". ")
    .trim();
}

const NEXT_SECTION_MARKER = "[NEXT_SECTION]";

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
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<Blob | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef("");

  // Load available TTS voices (they load async in some browsers)
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis?.getVoices() ?? [];
      if (v.length) {
        setVoices(v);
        const def = v.find((x) => x.default) ?? v[0];
        setSelectedVoice((prev) => prev || def?.name || "");
      }
    }
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function speak(text: string, enabled: boolean) {
    if (!enabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    if (selectedVoice) {
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      setSession(s);
      if (s.messages && s.messages.length > 0) {
        setMessages(
          s.messages.map((m: Message) => ({
            id: String(m.id),
            role: m.role,
            content: m.content,
          }))
        );
        // Restore section from saved messages
        const sectionIndex = s.messages.reduce(
          (max: number, m: Message) => Math.max(max, m.section_index ?? 0),
          0
        );
        setCurrentSection(sectionIndex);
        setStarted(true);
        if (s.completed_at) setDone(true);
      }
    });
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop TTS when component unmounts
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const appendChunk = useCallback((id: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m))
    );
  }, []);

  // Clean marker from displayed text and advance section counter
  const finalizeInterviewerMessage = useCallback(
    (id: string, tts: boolean) => {
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== id) return m;
          const cleaned = m.content.replace(NEXT_SECTION_MARKER, "").trim();
          return { ...m, content: cleaned, streaming: false };
        });
        // Detect section transition
        const msg = prev.find((m) => m.id === id);
        if (msg?.content.includes(NEXT_SECTION_MARKER)) {
          setCurrentSection((s) => s + 1);
        }
        // Speak the cleaned message
        const finalMsg = updated.find((m) => m.id === id);
        if (finalMsg) speak(finalMsg.content, tts);
        return updated;
      });
    },
    []
  );

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
      finalizeInterviewerMessage(msgId, ttsEnabled);
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  async function sendMessage(text: string, audioBlob?: Blob) {
    if (!sessionId || busy || !text.trim()) return;
    setBusy(true);
    setInput("");
    window.speechSynthesis?.cancel();

    const candidateId = crypto.randomUUID();
    const interviewerId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: candidateId, role: "candidate", content: text },
      { id: interviewerId, role: "interviewer", content: "", streaming: true },
    ]);

    if (audioBlob) {
      uploadAudio(sessionId, audioBlob).catch(console.error);
    }

    try {
      for await (const chunk of streamMessage(sessionId, text, currentSection)) {
        appendChunk(interviewerId, chunk);
      }
      finalizeInterviewerMessage(interviewerId, ttsEnabled);
    } catch (e) {
      setError(String(e));
    }
    setBusy(false);
  }

  function handleVoiceTranscript(text: string) {
    inputRef.current = text;
    setInput(text);
  }

  function handleAudioCaptured(blob: Blob) {
    setPendingAudio(blob);
  }

  function submitInput() {
    const text = inputRef.current;
    if (!text.trim()) return;
    sendMessage(text, pendingAudio ?? undefined);
    setPendingAudio(null);
  }

  async function handleFinish() {
    if (!sessionId) return;
    window.speechSynthesis?.cancel();
    await completeSession(sessionId);
    setDone(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitInput();
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
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">
            {session.position}{session.company ? ` · ${session.company}` : ""}
          </p>
          <p className="text-slate-400 text-xs">{session.user_name}</p>
        </div>

        {/* Voice selector + TTS toggle */}
        {voices.length > 0 && ttsEnabled && (
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 max-w-[160px] focus:outline-none focus:border-blue-500 hidden sm:block"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            const next = !ttsEnabled;
            setTtsEnabled(next);
            if (!next) window.speechSynthesis?.cancel();
          }}
          title={ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

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

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!started && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <p className="text-slate-400">
                  Ready for your mock interview for{" "}
                  <span className="text-white font-medium">{session.position}</span>?
                </p>
                <p className="text-slate-500 text-sm">
                  {session.interview_plan.length} sections ·{" "}
                  {session.interview_plan.reduce((a, s) => a + s.questions.length, 0)} questions
                </p>
                <p className="text-slate-600 text-xs">
                  AI voice is {ttsEnabled ? "on" : "off"} — toggle with the speaker icon above
                </p>
                <button onClick={startInterview} disabled={busy} className="btn-primary">
                  {busy ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                  Begin Interview
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSpeak={ttsEnabled ? (text) => speak(text, true) : undefined}
              />
            ))}

            {done && (
              <div className="flex justify-center pt-4">
                <div className="card text-center space-y-3 max-w-sm">
                  <CheckCircle size={32} className="text-emerald-400 mx-auto" />
                  <p className="font-semibold text-white">Interview Complete!</p>
                  <button onClick={() => navigate(`/session/${sessionId}`)} className="btn-primary w-full">
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
                  onTranscript={handleVoiceTranscript}
                  onRecordingChange={setIsVoiceRecording}
                  onAudioCaptured={handleAudioCaptured}
                  disabled={busy}
                />
                <textarea
                  className={`input flex-1 resize-none min-h-[44px] max-h-36 leading-tight py-3 ${isVoiceRecording ? "border-red-500" : ""}`}
                  placeholder={isVoiceRecording ? "🎙️ Listening… speak your answer" : "Type your answer… (Enter to send, Shift+Enter for newline)"}
                  value={input}
                  onChange={(e) => { inputRef.current = e.target.value; setInput(e.target.value); }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={busy}
                />
                <button
                  onClick={submitInput}
                  disabled={busy || !input.trim()}
                  className="btn-primary px-3 py-3 flex items-center justify-center"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-slate-600 text-xs text-center mt-2">
                🎙️ Click mic to record — stops and sends automatically · 🔊 AI voice {ttsEnabled ? "on" : "off"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
