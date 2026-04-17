export interface InterviewSection {
  id: string;
  name: string;
  description: string;
  questions: string[];
}

export interface Session {
  id: string;
  user_name: string;
  position: string;
  company: string;
  job_description: string;
  interview_plan: InterviewSection[];
  created_at: string;
  completed_at: string | null;
  overall_score: number | null;
  messages?: Message[];
}

export interface Message {
  id: number;
  session_id: string;
  role: "interviewer" | "candidate";
  content: string;
  section_index: number;
  message_type: "question" | "answer" | "feedback" | "system";
  score: number | null;
  audio_path: string | null;
  created_at: string;
}

export interface CreateSessionPayload {
  user_name: string;
  position: string;
  company: string;
  job_description: string;
}
