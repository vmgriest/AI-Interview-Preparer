import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession } from "../api/client";
import type { Session } from "../types";
import { ArrowLeft, Loader2, User, BrainCircuit } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function SessionReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Session not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/history")}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {session.position}
            {session.company ? ` · ${session.company}` : ""}
          </h1>
          <p className="text-slate-400 text-sm">
            {session.user_name} ·{" "}
            {new Date(session.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {session.messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "candidate" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`p-2 rounded-full h-9 w-9 flex items-center justify-center shrink-0 ${
                msg.role === "interviewer"
                  ? "bg-blue-600/20 text-blue-400"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              {msg.role === "interviewer" ? <BrainCircuit size={16} /> : <User size={16} />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "interviewer"
                  ? "bg-slate-800 text-slate-100 rounded-tl-sm"
                  : "bg-blue-700 text-white rounded-tr-sm"
              }`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.audio_path && (
                <audio
                  controls
                  src={`/${msg.audio_path}`}
                  className="mt-2 w-full h-8"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
