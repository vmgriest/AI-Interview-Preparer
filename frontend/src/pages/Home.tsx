import { useNavigate } from "react-router-dom";
import { BrainCircuit, History, Play, ChevronRight } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-4 bg-blue-600/20 rounded-2xl">
            <BrainCircuit size={56} className="text-blue-400" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            AI Interview Preparer
          </h1>
          <p className="text-slate-400 text-xl">
            Structured mock interviews powered by Ollama — fully local, fully private.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: "🎯", title: "Structured", desc: "OOP, DSA, algorithms + job-specific topics" },
            { icon: "🎙️", title: "Voice or Text", desc: "Speak your answers or type them" },
            { icon: "💾", title: "Saved Sessions", desc: "Review past interviews and track progress" },
          ].map((f) => (
            <div key={f.title} className="card space-y-2">
              <span className="text-2xl">{f.icon}</span>
              <p className="font-semibold text-white">{f.title}</p>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <button
            onClick={() => navigate("/setup")}
            className="btn-primary flex items-center justify-center gap-2 text-base"
          >
            <Play size={18} />
            Start New Interview
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => navigate("/history")}
            className="btn-ghost flex items-center justify-center gap-2 text-base"
          >
            <History size={18} />
            View Past Sessions
          </button>
        </div>

        <p className="text-slate-600 text-sm">
          Running on <span className="text-slate-400">Ollama llama3:8b</span> · 100% local
        </p>
      </div>
    </div>
  );
}
