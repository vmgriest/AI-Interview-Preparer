import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, BrainCircuit } from "lucide-react";
import { createSession } from "../api/client";

export default function Setup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    user_name: "",
    position: "",
    company: "",
    job_description: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.user_name.trim() || !form.position.trim()) return;
    setLoading(true);
    setError("");
    try {
      const session = await createSession(form);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-3">
          <BrainCircuit size={28} className="text-blue-400" />
          <h1 className="text-2xl font-bold">Interview Setup</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Your Name *</label>
            <input
              className="input"
              placeholder="e.g. Alex Johnson"
              value={form.user_name}
              onChange={(e) => update("user_name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Target Position *</label>
            <input
              className="input"
              placeholder="e.g. Senior Software Engineer"
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Company</label>
            <input
              className="input"
              placeholder="e.g. Google (optional)"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Job Description
              <span className="text-slate-500 font-normal ml-1">
                — paste it to get job-specific questions
              </span>
            </label>
            <textarea
              className="input min-h-[140px] resize-y font-mono text-sm"
              placeholder="Paste the job description here (optional)..."
              value={form.job_description}
              onChange={(e) => update("job_description", e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.user_name.trim() || !form.position.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {form.job_description ? "Analyzing job description…" : "Creating session…"}
              </>
            ) : (
              "Start Interview"
            )}
          </button>

          <p className="text-slate-500 text-xs text-center">
            Base sections always included: Intro, Behavioral, OOP, Data Structures, Algorithms
            {form.job_description && " + Job-Specific"}
          </p>
        </form>
      </div>
    </div>
  );
}
