export interface User {
  id?: string;
  name?: string;
  userId?: string;
  role?: string;
  email?: string;
  avatarUrl?: string;
  subject?: string;
  dob?: string;
  class?: string;
  gender?: string;
  requiresPasswordChange?: boolean;
  joined_at?: string;
  profilePicture?: string;
  organizationName?: string;
  organizationLogo?: string;
}

export interface LoginRequest {
  userId: string;
  password: string;
  role?: string;
  subject?: string;
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

export type TestStatus = "draft" | "live" | "scheduled" | null;
export type TestDifficulty = "easy" | "medium" | "hard";
export type TestType = "practice" | "mock" | "previous_year";
export type CorrectOption = string;

export interface TestSection {
  name: string;
  subject: string;
  duration: number;
  questions_count: number;
  questions?: string[];
}

export interface Test {
  id: string;
  name: string;
  type: string;
  subject: string | string[];
  subject_id?: string;
  subject_ids?: string[];
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
  start_time?: string;
  end_time?: string;
  results_shared?: boolean;
  lateEntryTime?: number;
  graceTime?: number;
  tabSwitchLimit?: number;
  class?: string;
  sections?: TestSection[];
}

export interface Passage {
  id: string;
  title: string;
  content: string;
  subject_id: string;
  class?: string;
  created_by?: string;
}

export interface Question {
  id?: string;
  type: "mcq" | "passage_sub_question";
  passage_id?: string;
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
  image_url?: string;
  new_topic_name?: string;
  new_sub_topic_name?: string;
  topic_name?: string;
  sub_topic_name?: string;
  subject_id?: string;
  subject?: string;
  class?: string;
  created_by?: string;
}

export interface TestPayload {
  name: string;
  subject: string | string[];
  subject_id?: string;
  subject_ids?: string[];
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
  start_time?: string;
  end_time?: string;
  results_shared?: boolean;
  lateEntryTime?: number;
  graceTime?: number;
  tabSwitchLimit?: number;
  class?: string;
  sections?: TestSection[];
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export interface Attempt {
  id?: string;
  test_id: string;
  test_name?: string;
  user_id: string;
  score: number;
  total_marks?: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  answers: Record<string, string>;
  time_spent: number;
  tab_switches?: number;
  submitted_at: string;
  submission_type?: string;
  status?: "draft" | "submitted";
  rank?: number;
  test_copy?: Array<{
    id?: string;
    question: string;
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    correct_option: string;
    selected_option?: string;
    media_url?: string;
    image_url?: string;
  }>;
}

export interface AttemptPayload {
  test_id: string;
  user_id?: string;
  answers: Record<string, string>;
  time_spent: number;
  tab_switches?: number;
}

export interface AppNotification {
  id: string;
  message: string;
  type: "test_live" | "result_declared";
  test_id: string;
  test_name: string;
  read: boolean;
  created_at: string;
}

export interface OrganizationFeatures {
  cameraMonitoring?: boolean;
  microphoneMonitoring?: boolean;
  fullscreenMode?: boolean;
  tabSwitchingDetection?: boolean;
  screenSharingDetection?: boolean;
  copyPasteDisabled?: boolean;
  rightClickDisabled?: boolean;
  developerToolsDetection?: boolean;
  multipleMonitorDetection?: boolean;
  faceDetection?: boolean;
  browserLock?: boolean;
  autoSave?: boolean;
  screenRecordingDetection?: boolean;
  printDisabled?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  securityFeatures?: Record<string, boolean> | OrganizationFeatures;
  brandingBannerText?: string;
  brandingColor?: string;
}
