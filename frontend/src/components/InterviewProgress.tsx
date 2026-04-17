import type { InterviewSection } from "../types";
import { CheckCircle, Circle, ChevronRight } from "lucide-react";

interface Props {
  sections: InterviewSection[];
  currentSection: number;
  messageCount: number;
}

export default function InterviewProgress({ sections, currentSection, messageCount }: Props) {
  let questionsSoFar = 0;

  return (
    <div className="p-4 space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
        Interview Progress
      </p>
      {sections.map((section, idx) => {
        const startQ = questionsSoFar;
        questionsSoFar += section.questions.length;

        const isComplete = messageCount >= questionsSoFar;
        const isCurrent = idx === currentSection;
        const isPast = idx < currentSection;

        return (
          <div
            key={section.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isCurrent
                ? "bg-blue-600/20 border border-blue-700/50"
                : isPast || isComplete
                ? "opacity-60"
                : "opacity-40"
            }`}
          >
            <div className="shrink-0">
              {isPast || isComplete ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : isCurrent ? (
                <ChevronRight size={16} className="text-blue-400" />
              ) : (
                <Circle size={16} className="text-slate-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-medium truncate ${
                  isCurrent ? "text-blue-300" : "text-slate-400"
                }`}
              >
                {section.name}
              </p>
              <p className="text-slate-600 text-xs">{section.questions.length} questions</p>
            </div>
          </div>
        );
      })}

      <div className="mt-4 px-2">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{
              width: `${
                sections.length
                  ? (Math.min(currentSection, sections.length) / sections.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <p className="text-slate-600 text-xs mt-1.5">
          Section {Math.min(currentSection + 1, sections.length)} of {sections.length}
        </p>
      </div>
    </div>
  );
}
