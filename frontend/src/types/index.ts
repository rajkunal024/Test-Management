export interface User {
  id?: string;
  name?: string;
  userId?: string;
  role?: string;
  email?: string;
  avatarUrl?: string;
}

export interface LoginRequest {
  userId: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export type TestStatus = "draft" | "live" | null;
export type TestDifficulty = "easy" | "medium" | "hard";
export type TestType = "practice" | "mock" | "previous_year";
export type CorrectOption = "option1" | "option2" | "option3" | "option4";

export interface Test {
  id: string;
  name: string;
  type: string;
  subject: string;
  subject_id?: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
  questions: string[];
  created_at: string;
}

export interface Question {
  id?: string;
  type: "mcq";
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: CorrectOption;
  explanation?: string;
  difficulty?: string;
  test_id: string;
  topic_id?: string;
  sub_topic_id?: string;
  media_url?: string;
}

export interface TestPayload {
  name: string;
  subject: string;
  subject_id?: string;
  type: TestType;
  topics: string[];
  sub_topics: string[];
  difficulty: TestDifficulty;
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
  questions?: string[];
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}
