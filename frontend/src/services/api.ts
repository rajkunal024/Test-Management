import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  ApiEnvelope,
  AuthResponse,
  LoginRequest,
  Question,
  Passage,
  Subject,
  SubTopic,
  Test,
  TestPayload,
  Topic,
  Attempt,
  AttemptPayload,
  User,
  AppNotification,
  Organization,
  LmsMaterial,
} from "../types";
import { useAuthStore } from "../store/authStore";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
let BASE_URL = "/api/";
if (rawBaseUrl && rawBaseUrl.trim() !== "") {
  let cleaned = rawBaseUrl.trim().replace(/\/+$/, "");
  if (!cleaned.endsWith("/api")) {
    cleaned = `${cleaned}/api`;
  }
  BASE_URL = `${cleaned}/`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
};

const collectErrorMessages = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectErrorMessages);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directMessage = record.message ?? record.msg ?? record.error;
    if (typeof directMessage === "string") return [directMessage];
    return Object.values(record).flatMap(collectErrorMessages);
  }
  return [];
};

export const getTenantSubdomain = (): string | null => {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length > 1) {
    const sub = parts[0].toLowerCase().trim();
    if (sub !== "www" && sub !== "localhost" && sub !== "127" && sub !== "app" && sub !== "api") {
      return sub;
    }
  }
  return null;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token ?? localStorage.getItem("parikshya_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantSub = getTenantSubdomain();
  if (tenantSub) {
    config.headers["x-tenant-id"] = tenantSub;
  }
  // Strip leading slash from relative paths so baseURL subpath (/api/) is preserved
  if (config.url && config.url.startsWith("/") && !config.url.startsWith("//")) {
    config.url = config.url.substring(1);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 || (error.response?.status === 403 && (error.response?.data as any)?.message?.includes("different organization"))) {
      const isLoginRequest = error.config?.url?.includes("/login") || error.config?.url?.includes("/auth/login");
      if (!isLoginRequest) {
        useAuthStore.getState().clearAuth();
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string; error?: string; errors?: unknown } | undefined;
    const details = collectErrorMessages(responseData?.errors).join(", ");
    if (details) return details;
    return responseData?.message ?? responseData?.error ?? "Something went wrong. Please try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

export interface TenantDomainInfo {
  id: string;
  name: string;
  code: string;
  logo?: string;
  brandingBannerText?: string;
  brandingColor?: string;
  orgType?: string;
  status?: string;
}

export const getOrganizationByDomainApi = async (): Promise<TenantDomainInfo | null> => {
  const { data } = await api.get<ApiEnvelope<TenantDomainInfo | null>>("/auth/organization-by-domain");
  return unwrap(data);
};

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>("/auth/login", payload);
  return unwrap(data);
};

export interface CaptchaResponse {
  captchaId: string;
  captcha: string;
  captchaSvg: string;
}

export const fetchCaptcha = async (role: "Student" | "Teacher" | "Admin"): Promise<CaptchaResponse> => {
  const lowerRole = role.toLowerCase();
  const { data } = await api.get<ApiEnvelope<CaptchaResponse>>(`/login/${lowerRole}/captcha`);
  return unwrap(data);
};

export const loginStudent = async (payload: LoginRequest): Promise<AuthResponse> => {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>("/login/student", {
    email: payload.userId,
    password: payload.password,
    captchaId: payload.captchaId,
    captcha: payload.captcha
  });
  return unwrap(data);
};

export const loginTeacher = async (payload: LoginRequest): Promise<AuthResponse> => {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>("/login/teacher", {
    email: payload.userId,
    password: payload.password,
    captchaId: payload.captchaId,
    captcha: payload.captcha
  });
  return unwrap(data);
};

export const loginAdmin = async (payload: LoginRequest): Promise<AuthResponse> => {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>("/login/admin", {
    email: payload.userId,
    password: payload.password,
    captchaId: payload.captchaId,
    captcha: payload.captcha
  });
  return unwrap(data);
};

export const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};

export const getSubjects = async (classFilter?: string | any): Promise<Subject[]> => {
  const filter = typeof classFilter === "string" ? classFilter : undefined;
  const { data } = await api.get<ApiEnvelope<Subject[]> | Subject[]>("/subjects", {
    params: filter ? { class: filter } : undefined
  });
  return unwrap(data);
};

export const createSubject = async (payload: string | { name: string; program_ids?: string[]; program_semesters?: { program_id: string; semester: number }[]; classes?: string[] }): Promise<Subject> => {
  const body = typeof payload === "string" ? { name: payload } : payload;
  const { data } = await api.post<ApiEnvelope<Subject> | Subject>("/subjects", body);
  return unwrap(data);
};

export const updateSubject = async (subjectId: string, payload: { name: string; program_ids?: string[]; program_semesters?: { program_id: string; semester: number }[]; classes?: string[] }): Promise<Subject> => {
  const { data } = await api.put<ApiEnvelope<Subject> | Subject>(`/subjects/${subjectId}`, payload);
  return unwrap(data);
};

export const deleteSubject = async (subjectId: string): Promise<void> => {
  await api.delete(`/subjects/${subjectId}`);
};

export const getTopicsBySubject = async (subjectId: string): Promise<Topic[]> => {
  const { data } = await api.get<ApiEnvelope<Topic[]> | Topic[]>(`/topics/subject/${subjectId}`);
  return unwrap(data);
};

export const getSubTopicsByTopics = async (topicIds: string[]): Promise<SubTopic[]> => {
  const { data } = await api.post<ApiEnvelope<SubTopic[]> | SubTopic[]>("/sub-topics/multi-topics", { topicIds });
  return unwrap(data);
};

export const getAllTests = async (): Promise<Test[]> => {
  const { data } = await api.get<ApiEnvelope<Test[]> | Test[]>("/tests");
  return unwrap(data);
};

export const getTestById = async (id: string): Promise<Test> => {
  const { data } = await api.get<ApiEnvelope<Test> | Test>(`/tests/${id}`);
  return unwrap(data);
};

export const createTest = async (payload: TestPayload): Promise<Test> => {
  const { data } = await api.post<ApiEnvelope<Test> | Test>("/tests", payload);
  return unwrap(data);
};

export const updateTest = async (id: string, payload: Partial<TestPayload>): Promise<Test> => {
  const { data } = await api.put<ApiEnvelope<Test> | Test>(`/tests/${id}`, payload);
  return unwrap(data);
};

export const deleteTest = async (id: string): Promise<void> => {
  await api.delete(`/tests/${id}`);
};

export const bulkCreateQuestions = async (testId: string, questions: Question[]): Promise<Question[]> => {
  const { data } = await api.post<ApiEnvelope<Question[]> | Question[]>("/questions/bulk", {
    test_id: testId,
    questions,
  });
  return unwrap(data);
};

export const fetchBulkQuestions = async (questionIds: string[]): Promise<Question[]> => {
  const { data } = await api.post<ApiEnvelope<Question[]> | Question[]>("/questions/fetchBulk", {
    question_ids: questionIds,
  });
  return unwrap(data);
};

export const publishTest = async (id: string): Promise<Test> => updateTest(id, { status: "live" });

export const submitAttempt = async (payload: AttemptPayload): Promise<Attempt> => {
  const { data } = await api.post<ApiEnvelope<Attempt> | Attempt>("/attempts", payload);
  return unwrap(data);
};

export const getAllAttempts = async (): Promise<Attempt[]> => {
  const { data } = await api.get<ApiEnvelope<Attempt[]> | Attempt[]>("/attempts");
  return unwrap(data);
};

export const shareTestResults = async (testId: string): Promise<Test> => {
  const { data } = await api.post<ApiEnvelope<Test> | Test>(`/tests/${testId}/share-results`);
  return unwrap(data);
};

export const getAllQuestions = async (): Promise<Question[]> => {
  const { data } = await api.get<ApiEnvelope<Question[]> | Question[]>("/questions");
  return unwrap(data);
};

export const createQuestion = async (payload: Question): Promise<Question> => {
  const { data } = await api.post<ApiEnvelope<Question> | Question>("/questions", payload);
  return unwrap(data);
};

export const updateQuestion = async (id: string, payload: Partial<Question>): Promise<Question> => {
  const { data } = await api.put<ApiEnvelope<Question> | Question>(`/questions/${id}`, payload);
  return unwrap(data);
};

export const deleteQuestion = async (id: string): Promise<void> => {
  await api.delete(`/questions/${id}`);
};

export const getAllPassages = async (): Promise<Passage[]> => {
  const { data } = await api.get<ApiEnvelope<Passage[]> | Passage[]>("/passages");
  return unwrap(data);
};

export const getPassageById = async (id: string): Promise<Passage> => {
  const { data } = await api.get<ApiEnvelope<Passage> | Passage>(`/passages/${id}`);
  return unwrap(data);
};

export const createPassage = async (payload: Partial<Passage>): Promise<Passage> => {
  const { data } = await api.post<ApiEnvelope<Passage> | Passage>("/passages", payload);
  return unwrap(data);
};

export const updatePassage = async (id: string, payload: Partial<Passage>): Promise<Passage> => {
  const { data } = await api.put<ApiEnvelope<Passage> | Passage>(`/passages/${id}`, payload);
  return unwrap(data);
};

export const deletePassage = async (id: string): Promise<void> => {
  await api.delete(`/passages/${id}`);
};

export const getAdminUsers = async (): Promise<User[]> => {
  const { data } = await api.get<ApiEnvelope<User[]> | User[]>("/admin/users");
  return unwrap(data);
};

export const registerUser = async (payload: Partial<User> & { password?: string }): Promise<User> => {
  const { data } = await api.post<ApiEnvelope<User> | User>("/admin/users", payload);
  return unwrap(data);
};

export const updateUser = async (userId: string, payload: Partial<User>): Promise<User> => {
  const { data } = await api.put<ApiEnvelope<User> | User>(`/admin/users/${userId}`, payload);
  return unwrap(data);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

export const signupAdmin = async (payload: { userId: string; password?: string; name: string; signupKey: string }): Promise<User> => {
  const { data } = await api.post<ApiEnvelope<User> | User>("/auth/signup-admin", payload);
  return unwrap(data);
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const { data } = await api.get<ApiEnvelope<AppNotification[]> | AppNotification[]>("/notifications");
  return unwrap(data);
};

export const markNotificationsRead = async (): Promise<void> => {
  await api.post("/notifications/read-all");
};

export const clearAllNotifications = async (): Promise<void> => {
  await api.delete("/notifications/clear-all");
};

export interface ActiveStream {
  user_id: string;
  username: string;
  frame: string;
  hasVideo: boolean;
  hasAudio: boolean;
  lastSeen: number;
}

export const uploadStreamFrame = async (payload: {
  test_id: string;
  user_id: string;
  username: string;
  frame: string;
  screenFrame?: string;
  hasVideo: boolean;
  hasAudio: boolean;
}): Promise<void> => {
  await api.post("/attempts/stream-frame", payload);
};

export const getActiveStreams = async (testId: string): Promise<ActiveStream[]> => {
  const { data } = await api.get<ApiEnvelope<ActiveStream[]> | ActiveStream[]>(`/attempts/active-streams?test_id=${testId}`);
  return unwrap(data);
};

export const changePassword = async (payload: { oldPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post("/auth/change-password", payload);
  return data;
};

export const bulkRegisterUsers = async (users: any[]): Promise<{ success: boolean; count: number; errors?: string[] }> => {
  const { data } = await api.post("/admin/users/bulk", { users });
  return data;
};

export interface TestCsvPayload {
  name: string;
  total_time: number;
  lateEntryTime?: number;
  graceTime?: number;
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  type: string;
  class: string;
  status: "draft" | "live";
  questions: any[];
  total_questions?: number;
  start_time?: string;
  end_time?: string;
}

export interface TestCsvResponse {
  success: boolean;
  data: Test;
  summary: {
    totalRows: number;
    newSubjects: number;
    newTopics: number;
    newSubTopics: number;
    newQuestions: number;
    reusedQuestions: number;
    failedRows: number;
  };
  errors: { row: number; error: string }[];
}

export const createTestFromCsv = async (payload: TestCsvPayload): Promise<TestCsvResponse> => {
  const { data } = await api.post("/tests/csv-import", payload);
  return data;
};

export const uploadQuestionImage = async (formData: FormData): Promise<{ success: boolean; image_url: string }> => {
  const { data } = await api.post<{ success: boolean; image_url: string }>("/questions/upload-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
};

export const verifyOtp = async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post("/auth/verify-otp", { email, otp });
  return data;
};

export const resetPassword = async (payload: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post("/auth/reset-password", payload);
  return data;
};

export const uploadProfilePicture = async (formData: FormData): Promise<{ success: boolean; profilePicture: string }> => {
  const { data } = await api.post<{ success: boolean; profilePicture: string }>("/auth/profile-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const getMyOrganization = async (): Promise<Organization> => {
  const { data } = await api.get<ApiEnvelope<Organization> | Organization>("/auth/organization");
  return unwrap(data);
};

export interface AIGeneratedQuestion {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: string;
  difficulty: string;
  class: string;
}

export const generateAIQuestionsApi = async (payload: {
  topic: string;
  difficulty: string;
  class: string;
  count: number;
}): Promise<AIGeneratedQuestion[]> => {
  const { data } = await api.post<ApiEnvelope<AIGeneratedQuestion[]> | AIGeneratedQuestion[]>("/questions/generate-ai", payload);
  return unwrap(data);
};

export interface ClassItem {
  id: string;
  name: string;
  numericOrder: number;
}

export interface SessionItem {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface ProgramItem {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
}

export const getClasses = async (): Promise<ClassItem[]> => {
  const { data } = await api.get<ApiEnvelope<ClassItem[]> | ClassItem[]>("/classes");
  return unwrap(data);
};

export const createClass = async (payload: { name: string; numericOrder: number }): Promise<ClassItem> => {
  const { data } = await api.post<ApiEnvelope<ClassItem> | ClassItem>("/classes", payload);
  return unwrap(data);
};

export const getSessions = async (): Promise<SessionItem[]> => {
  const { data } = await api.get<ApiEnvelope<SessionItem[]> | SessionItem[]>("/sessions");
  return unwrap(data);
};

export const createSession = async (payload: { name: string; isCurrent: boolean }): Promise<SessionItem> => {
  const { data } = await api.post<ApiEnvelope<SessionItem> | SessionItem>("/sessions", payload);
  return unwrap(data);
};

export const setCurrentSessionApi = async (sessionId: string): Promise<SessionItem> => {
  const { data } = await api.put<ApiEnvelope<SessionItem> | SessionItem>(`/sessions/${sessionId}/current`);
  return unwrap(data);
};

export const getPrograms = async (): Promise<ProgramItem[]> => {
  const { data } = await api.get<ApiEnvelope<ProgramItem[]> | ProgramItem[]>("/programs");
  return unwrap(data);
};

export const createProgram = async (payload: { name: string; code: string; totalSemesters?: number }): Promise<ProgramItem> => {
  const { data } = await api.post<ApiEnvelope<ProgramItem> | ProgramItem>("/programs", payload);
  return unwrap(data);
};

export interface SchoolPromotionResponse {
  success: boolean;
  message: string;
  data: {
    promotedCount: number;
    promoted: string[];
    failedToQualify: { name: string; score: number }[];
    alreadyPromoted: string[];
  };
}

export interface CollegePromotionResponse {
  success: boolean;
  message: string;
  data: {
    promotedCount: number;
    promoted: string[];
  };
}

export const promoteSchoolStudentsApi = async (payload: {
  sourceSession: string;
  targetSession: string;
  sourceClass: string;
  targetClass: string;
}): Promise<SchoolPromotionResponse> => {
  const { data } = await api.post<SchoolPromotionResponse>("/students/promote/school", payload);
  return data;
};

export const promoteCollegeStudentsApi = async (payload: {
  programId: string;
  currentSemester: number;
  targetSemester: number;
}): Promise<CollegePromotionResponse> => {
  const { data } = await api.post<CollegePromotionResponse>("/students/promote/college", payload);
  return data;
};

export interface SemesterItem {
  id: string;
  name: string;
}

export const updateProgram = async (programId: string, payload: { name: string; code: string; totalSemesters: number }): Promise<ProgramItem> => {
  const { data } = await api.put<ApiEnvelope<ProgramItem> | ProgramItem>(`/programs/${programId}`, payload);
  return unwrap(data);
};

export const deleteProgram = async (programId: string): Promise<void> => {
  await api.delete(`/programs/${programId}`);
};

export const getSemesters = async (): Promise<SemesterItem[]> => {
  const { data } = await api.get<ApiEnvelope<SemesterItem[]> | SemesterItem[]>("/semesters");
  return unwrap(data);
};

export const createSemester = async (payload: { name: string }): Promise<SemesterItem> => {
  const { data } = await api.post<ApiEnvelope<SemesterItem> | SemesterItem>("/semesters", payload);
  return unwrap(data);
};

export const updateSemester = async (semesterId: string, payload: { name: string }): Promise<SemesterItem> => {
  const { data } = await api.put<ApiEnvelope<SemesterItem> | SemesterItem>(`/semesters/${semesterId}`, payload);
  return unwrap(data);
};

export const deleteSemester = async (semesterId: string): Promise<void> => {
  await api.delete(`/semesters/${semesterId}`);
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<ApiEnvelope<User> | User>("/auth/me");
  return unwrap(data);
};

export const getMaterialsApi = async (params: { program_id?: string; semester?: number; class?: string; subject_id?: string }): Promise<LmsMaterial[]> => {
  const { data } = await api.get<ApiEnvelope<LmsMaterial[]> | LmsMaterial[]>("/lms/materials", { params });
  return unwrap(data);
};

export const uploadMaterialApi = async (formData: FormData): Promise<LmsMaterial> => {
  const { data } = await api.post<ApiEnvelope<LmsMaterial> | LmsMaterial>("/lms/materials", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return unwrap(data);
};

export const createMaterialUrlApi = async (payload: {
  title: string;
  description?: string;
  file_url: string;
  resource_type: string;
  program_id?: string;
  semester?: number;
  class?: string;
  subject_id: string;
  readme_content?: string;
  html_content?: string;
  text_content?: string;
}): Promise<LmsMaterial> => {
  const { data } = await api.post<ApiEnvelope<LmsMaterial> | LmsMaterial>("/lms/materials", payload);
  return unwrap(data);
};

export const deleteMaterialApi = async (materialId: string): Promise<void> => {
  await api.delete(`/lms/materials/${materialId}`);
};

export const updateMaterialApi = async (
  materialId: string,
  payload: {
    title: string;
    description?: string;
    program_id?: string;
    semester?: number;
    class?: string;
    subject_id: string;
    readme_content?: string;
    html_content?: string;
    text_content?: string;
  }
): Promise<LmsMaterial> => {
  const { data } = await api.put<ApiEnvelope<LmsMaterial> | LmsMaterial>(`/lms/materials/${materialId}`, payload);
  return unwrap(data);
};
