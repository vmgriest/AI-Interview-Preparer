import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  onRecordingChange?: (recording: boolean) => void;
  onAudioCaptured?: (blob: Blob) => void;
  disabled?: boolean;
}

async function transcribeOnBackend(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  const res = await fetch("/api/interviews/transcribe", { method: "POST", body: form });
  if (!res.ok) {
    console.error("Transcribe request failed", res.status, await res.text());
    return "";
  }
  const data = await res.json();
  console.log("Transcription result:", data);
  return data.text ?? "";
}

export default function VoiceInput({ onTranscript, onRecordingChange, onAudioCaptured, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [hasMic, setHasMic] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("audio/webm");

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) setHasMic(false);
  }, []);

  async function startRecording() {
    if (disabled || recording || transcribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick the best supported mimeType
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      const mimeType = preferred.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      mimeTypeRef.current = mimeType || "audio/webm";

      const mr = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.start(); // no timeslice — all audio delivered as one chunk on stop()
      setRecording(true);
      onRecordingChange?.(true);
    } catch (err) {
      console.error("Mic error:", err);
      setHasMic(false);
    }
  }

  function stopRecording() {
    if (!recording) return;

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;

    setRecording(false);
    onRecordingChange?.(false);

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      console.log(`Recording stopped. Blob size: ${blob.size} bytes, type: ${blob.type}`);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onAudioCaptured?.(blob);

      if (blob.size < 8000) {
        console.warn(`Audio too short (${blob.size} bytes)`);
        onTranscript("Recording too short — speak for a few seconds and try again.");
        return;
      }

      setTranscribing(true);
      try {
        const text = await transcribeOnBackend(blob);
        if (text) onTranscript(text);
      } catch (err) {
        console.error("Transcription error:", err);
      } finally {
        setTranscribing(false);
      }
    };

    mr.stop();
  }

  if (!hasMic) return null;

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={(disabled && !recording) || transcribing}
        title={recording ? "Stop — transcribe answer" : "Record voice answer"}
        className={`p-3 rounded-lg transition-all flex items-center justify-center ${
          recording
            ? "bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900"
            : transcribing
            ? "bg-slate-700 text-slate-400 cursor-wait"
            : "bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {transcribing
          ? <Loader2 size={18} className="animate-spin" />
          : recording
          ? <Square size={18} />
          : <Mic size={18} />}
      </button>
      <span className="text-xs text-slate-500 whitespace-nowrap">
        {transcribing ? "Transcribing…" : recording ? "Recording…" : ""}
      </span>
    </div>
  );
}
