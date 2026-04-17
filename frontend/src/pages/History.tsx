import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessions, deleteSession } from "../api/client";
import type { Session } from "../types";
import { ArrowLeft, Trash2, ExternalLink, Loader2, BrainCircuit } from "lucide-react";

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this session?")) return;
    await deleteSession(id);
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit size={24} className="text-blue-400" />
            Past Sessions
          </h1>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="card text-center py-12 space-y-3">
            <p className="text-slate-400">No interview sessions yet.</p>
            <button onClick={() => navigate("/setup")} className="btn-primary">
              Start Your First Interview
            </button>
          </div>
        )}

        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{s.position}</span>
                  {s.company && (
                    <span className="text-slate-500 text-sm">@ {s.company}</span>
                  )}
                  {s.completed_at ? (
                    <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-900/50 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm">{s.user_name}</p>
                <p className="text-slate-600 text-xs">
                  {new Date(s.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {s.overall_score != null && (
                  <p className="text-sm text-blue-400 font-medium">
                    Score: {s.overall_score.toFixed(1)}/10
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!s.completed_at && (
                  <button
                    onClick={() => navigate(`/interview/${s.id}`)}
                    title="Resume"
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
                {s.completed_at && (
                  <button
                    onClick={() => navigate(`/session/${s.id}`)}
                    title="View transcript"
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(s.id)}
                  title="Delete"
                  className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
