import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  ApiEnvelope,
  AuthResponse,
  LoginRequest,
  Question,
  Subject,
  SubTopic,
  Test,
  TestPayload,
  Topic,
} from "../types";
import { useAuthStore } from "../store/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token ?? localStorage.getItem("preproute_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
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

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>("/auth/login", payload);
  return unwrap(data);
};

export const getSubjects = async (): Promise<Subject[]> => {
  const { data } = await api.get<ApiEnvelope<Subject[]> | Subject[]>("/subjects");
  return unwrap(data);
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
