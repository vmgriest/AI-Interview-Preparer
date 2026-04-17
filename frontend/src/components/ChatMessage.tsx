import { BrainCircuit, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  message: {
    role: "interviewer" | "candidate";
    content: string;
    streaming?: boolean;
  };
}

export default function ChatMessage({ message }: Props) {
  const isInterviewer = message.role === "interviewer";

  return (
    <div className={`flex gap-3 ${isInterviewer ? "" : "flex-row-reverse"}`}>
      <div
        className={`p-2 rounded-full h-9 w-9 flex items-center justify-center shrink-0 mt-1 ${
          isInterviewer ? "bg-blue-600/20 text-blue-400" : "bg-slate-700 text-slate-300"
        }`}
      >
        {isInterviewer ? <BrainCircuit size={16} /> : <User size={16} />}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isInterviewer
            ? "bg-slate-800 text-slate-100 rounded-tl-sm"
            : "bg-blue-700 text-white rounded-tr-sm"
        }`}
      >
        {message.content ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="inline-flex gap-1 items-center text-slate-400">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        )}
        {message.streaming && message.content && (
          <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}
