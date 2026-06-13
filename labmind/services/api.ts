import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { storage } from './storage';
import type {
  TokenOut,
  RegisterData,
  Experiment,
  ExperimentStep,
  ExperimentSession,
  AIVerificationResult,
  AIChatResponse,
  AIAnalysisResult,
  User,
  StudentSummary,
  CohortSummary,
  LabSessionListItem,
  LabSessionDetail,
  JoinSessionResult,
  MyActiveLabSession,
} from '../types';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'bypass-tunnel-reminder': 'yes',
  },
  timeout: 45000,
});

// Track retry count per request
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retryCount?: number;
  }
}

// ── Request interceptor: attach JWT token ──────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: auto-logout on 401 ──────────────────────────────
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  _onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

    // Auto-retry on 502/503 gateway errors (tunnel instability)
    const status = error.response?.status;
    if ((status === 502 || status === 503 || !status) && config) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      if (config._retryCount <= 2) {
        console.warn(`[API] ${status ?? 'Network'} error — retry ${config._retryCount}/2...`);
        await new Promise(res => setTimeout(res, 1000));
        return apiClient(config);
      }
    }

    if (error.response?.status === 401 && _onUnauthorized) {
      await storage.clearAll();
      _onUnauthorized();
    }
    return Promise.reject(error);
  },
);

// ── Helper to extract error detail ────────────────────────────────────────
function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? error.message ?? 'Network error';
  }
  return 'An unexpected error occurred';
}

// ============================================================
// Auth API
// ============================================================

export const authAPI = {
  async login(email: string, password: string): Promise<TokenOut> {
    try {
      const res = await apiClient.post<TokenOut>('/auth/login', { email, password });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async register(data: RegisterData): Promise<TokenOut> {
    try {
      const res = await apiClient.post<TokenOut>('/auth/register', data);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getMe(): Promise<User> {
    try {
      const res = await apiClient.get<User>('/auth/me');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

// ============================================================
// Experiments API
// ============================================================

export const experimentsAPI = {
  async uploadPDF(formData: FormData): Promise<Experiment> {
    try {
      const res = await apiClient.post<Experiment>('/experiments/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // PDF parsing can take a while
      });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getPreloaded(): Promise<import('../types').PreloadedExperiment[]> {
    try {
      const res = await apiClient.get<import('../types').PreloadedExperiment[]>('/experiments/preloaded');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async startPreloaded(preloadedId: number): Promise<import('../types').StartPreloadedOut> {
    try {
      const res = await apiClient.post<import('../types').StartPreloadedOut>(
        `/experiments/start-preloaded/${preloadedId}`,
        {},
      );
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getAll(): Promise<Experiment[]> {
    try {
      const res = await apiClient.get<Experiment[]>('/experiments/');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getAllForInstructor(): Promise<Experiment[]> {
    try {
      const res = await apiClient.get<Experiment[]>('/experiments/all');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getById(id: number): Promise<Experiment> {
    try {
      const res = await apiClient.get<Experiment>(`/experiments/${id}`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getSteps(experimentId: number): Promise<ExperimentStep[]> {
    try {
      const res = await apiClient.get<ExperimentStep[]>(`/experiments/${experimentId}/steps`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};


// ============================================================
// Sessions API
// ============================================================

export const sessionsAPI = {
  async start(experimentId: number, force = false): Promise<ExperimentSession> {
    try {
      const res = await apiClient.post<ExperimentSession>('/sessions/start', {
        experiment_id: experimentId,
        force,
      });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getActiveSession(experimentId: number): Promise<ExperimentSession | null> {
    try {
      const res = await apiClient.get<ExperimentSession>(`/sessions/active/${experimentId}`);
      return res.data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) return null;
      throw new Error(extractError(e));
    }
  },

  async getById(sessionId: number): Promise<ExperimentSession> {
    try {
      const res = await apiClient.get<ExperimentSession>(`/sessions/${sessionId}`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async updateStep(sessionId: number, stepNumber: number, notes?: string): Promise<ExperimentSession> {
    try {
      const res = await apiClient.put<ExperimentSession>(`/sessions/${sessionId}/step`, {
        step_number: stepNumber,
        notes,
      });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async complete(sessionId: number): Promise<ExperimentSession> {
    try {
      const res = await apiClient.put<ExperimentSession>(`/sessions/${sessionId}/complete`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getActive(): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>('/sessions/active');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getMyActive(): Promise<import('../types').MySession[]> {
    try {
      const res = await apiClient.get<import('../types').MySession[]>('/sessions/my-active');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getMyCompleted(): Promise<import('../types').MySession[]> {
    try {
      const res = await apiClient.get<import('../types').MySession[]>('/sessions/my-completed');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async deleteSession(sessionId: number): Promise<{ message: string; session_id: number }> {
    try {
      const res = await apiClient.delete<{ message: string; session_id: number }>(`/sessions/${sessionId}`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

// ============================================================
// AI API
// ============================================================

interface ChatAPIPayload {
  messages: Array<{ role: string; content: string }>;
  experiment_context: string;
  current_step: string;
  session_id: number;
  student_name: string;
}

interface AnalyzeResultsPayload {
  observations?: string;
  answers?: import('../types').QuestionAnswer[];
  experiment: Record<string, unknown>;
  session_id: number;
  steps_completed: number;
}

export const aiAPI = {
  async parsePDF(pdfText: string): Promise<Experiment> {
    try {
      const res = await apiClient.post<Experiment>('/ai/parse-pdf', { pdf_text: pdfText });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async verifyImage(
    imageBase64: string,
    stepDescription: string,
    experimentName: string,
  ): Promise<AIVerificationResult> {
    try {
      const res = await apiClient.post<AIVerificationResult>('/ai/verify-image', {
        image_base64: imageBase64,
        step_description: stepDescription,
        experiment_name: experimentName,
      });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async chat(payload: ChatAPIPayload): Promise<AIChatResponse> {
    try {
      const res = await apiClient.post<AIChatResponse>('/ai/chat', payload);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async analyzeResults(payload: AnalyzeResultsPayload): Promise<AIAnalysisResult> {
    try {
      const res = await apiClient.post<AIAnalysisResult>('/ai/analyze-results', payload);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

export const overrideAPI = {
  async request(
    sessionId: number,
    stepNumber: number,
    experimentName: string,
    imageBase64?: string | null
  ): Promise<{ request_id: number; status: string }> {
    try {
      const res = await apiClient.post<{ request_id: number; status: string }>('/override/request', {
        session_id: sessionId,
        step_number: stepNumber,
        experiment_name: experimentName,
        image_base64: imageBase64,
      });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getPending(): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>('/override/pending');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async getResolved(): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>('/override/resolved');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async approve(requestId: number): Promise<any> {
    try {
      const res = await apiClient.put<any>(`/override/${requestId}/approve`, {});
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async reject(requestId: number): Promise<any> {
    try {
      const res = await apiClient.put<any>(`/override/${requestId}/reject`, {});
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  async checkStatus(sessionId: number, stepNumber: number): Promise<{ status: string }> {
    try {
      const res = await apiClient.get<{ status: string }>(`/override/check/${sessionId}/${stepNumber}`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

export const instructorAPI = {
  async getStudentSummary(studentId: number): Promise<StudentSummary> {
    try {
      const res = await apiClient.get<StudentSummary>(`/instructor/student/${studentId}/summary`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
  async getCohortSummary(): Promise<CohortSummary> {
    try {
      const res = await apiClient.get<CohortSummary>('/instructor/cohort/summary');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};

export const labSessionAPI = {
  // Instructor: create a new lab session
  async create(name: string, experimentId: number): Promise<LabSessionListItem> {
    try {
      const res = await apiClient.post<LabSessionListItem>('/lab-sessions/create', {
        name,
        experiment_id: experimentId,
      });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Instructor: list all sessions
  async list(): Promise<LabSessionListItem[]> {
    try {
      const res = await apiClient.get<LabSessionListItem[]>('/lab-sessions/');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Instructor: get detailed session with students
  async getDetail(sessionId: number): Promise<LabSessionDetail> {
    try {
      const res = await apiClient.get<LabSessionDetail>(`/lab-sessions/${sessionId}`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Instructor: close a session
  async close(sessionId: number): Promise<{ message: string }> {
    try {
      const res = await apiClient.put<{ message: string }>(`/lab-sessions/${sessionId}/close`, {});
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Instructor: delete a session
  async delete(sessionId: number): Promise<{ message: string }> {
    try {
      const res = await apiClient.delete<{ message: string }>(`/lab-sessions/${sessionId}`);
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Student: join a session by code
  async join(code: string): Promise<JoinSessionResult> {
    try {
      const res = await apiClient.post<JoinSessionResult>('/lab-sessions/join', { code });
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Student: get my active lab session (if any)
  async getMyActive(): Promise<{ active_session: MyActiveLabSession | null; active_sessions: MyActiveLabSession[] }> {
    try {
      const res = await apiClient.get<{ active_session: MyActiveLabSession | null; active_sessions: MyActiveLabSession[] }>('/lab-sessions/my-active/info');
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },

  // Student: link experiment session to enrollment after starting
  async linkExperimentSession(enrollmentId: number, experimentSessionId: number): Promise<{ message: string }> {
    try {
      const res = await apiClient.put<{ message: string }>(
        `/lab-sessions/enrollment/${enrollmentId}/link-session`,
        { experiment_session_id: experimentSessionId }
      );
      return res.data;
    } catch (e) {
      throw new Error(extractError(e));
    }
  },
};
