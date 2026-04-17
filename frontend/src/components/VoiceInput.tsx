import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  onAudioReady?: (blob: Blob) => void;
  disabled?: boolean;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export default function VoiceInput({ onTranscript, onAudioReady, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRec && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  async function startRecording() {
    if (disabled || recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up MediaRecorder for saving
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(250);

      // Set up Speech Recognition for live transcript
      const SpeechRecCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      let finalTranscript = "";
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }
        onTranscript(finalTranscript + interim);
        // Reset so we don't duplicate
        finalTranscript = "";
      };

      recognition.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
    }
  }

  function stopRecording() {
    if (!recording) return;

    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onAudioReady?.(blob);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.stop();
    }

    setRecording(false);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled}
      title={recording ? "Stop recording" : "Start voice input"}
      className={`p-3 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
        recording
          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
          : "bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
      }`}
    >
      {recording ? <Square size={18} /> : <Mic size={18} />}
    </button>
  );
}
