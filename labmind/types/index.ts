// ============================================================
// Core domain types
// ============================================================

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'instructor';
  created_at: string;
}

export interface ExperimentStep {
  id: number;
  experiment_id: number;
  step_number: number;
  title: string;
  description: string;
  why: string | null;
  safety_warning: string | null;
  checkpoint_required: boolean;
  is_completed: boolean;
}

export interface ResultQuestion {
  id: string;
  question: string;
  type: 'number' | 'text' | 'boolean' | 'textarea';
  unit: string | null;
  placeholder: string | null;
}

export interface QuestionAnswer {
  question_id: string;
  question: string;
  answer: string;
  unit: string | null;
}

export interface Experiment {
  id: number;
  user_id: number;
  name: string;
  objective: string;
  materials: string[];
  safety_notes: string[];
  created_at: string;
  steps: ExperimentStep[];
  active_session_id?: number | null;
  current_step_number?: number | null;
  result_questions?: ResultQuestion[] | null;
}

export interface PreloadedExperiment {
  id: number;
  name: string;
  subject: 'Chemistry' | 'Biology' | 'Kinetics';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration_minutes: number;
  step_count: number;
  objective: string;
  materials: string[];
  safety_notes: string[];
}

export interface StartPreloadedOut {
  session_id: number;
  experiment_id: number;
}

export interface ExperimentSession {
  id: number;
  experiment_id: number;
  user_id: number;
  current_step_number: number;
  status: 'active' | 'paused' | 'completed';
  started_at: string;
  completed_at: string | null;
}

export interface SessionProgress {
  id: number;
  session_id: number;
  step_id: number;
  completed_at: string;
  notes: string | null;
}

export interface Photo {
  id: number;
  session_id: number;
  step_id: number | null;
  file_path: string;
  ai_feedback: string | null;
  confidence_score: number | null;
  issues: string[];
  is_verified: boolean;
  created_at: string;
}

export interface ChatMessage {
  id?: number;
  session_id?: number;
  role: 'user' | 'assistant';
  content: string;
  step_context?: string;
  created_at?: string;
}

// ============================================================
// AI response types
// ============================================================

export interface AIVerificationResult {
  feedback: string;
  confidence_score: number;
  issues: string[];
  is_correct: boolean;
  suggestions: string[];
}

export interface AIChatResponse {
  reply: string;
}

export interface AIAnalysisResult {
  analysis: string;
  learning_summary: string;
  possible_errors: string[];
  accuracy_assessment: string;
  recommendations: string[];
  deviation: number;
  expected: string;
  observed: string;
}

// ============================================================
// Auth types
// ============================================================

export interface TokenOut {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'instructor';
}

// ============================================================
// Generic API wrapper
// ============================================================

export interface APIResponse<T> {
  data: T | null;
  error: string | null;
}

// ============================================================
// Navigation param types
// ============================================================

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

export type StudentStackParamList = {
  Dashboard: undefined;
  UploadProtocol: undefined;
  ExperimentOverview: { experimentId: number; labEnrollmentId?: number };
  ExperimentSession: { 
    sessionId: number; 
    experimentId: number;
    verifiedStepNumber?: number;
    isVerified?: boolean;
    // Lab session context (optional)
    labEnrollmentId?: number;
  };
  ImageVerification: {
    sessionId: number;
    experimentId: number;
    stepId: number;
    stepNumber: number;
    stepDescription: string;
    experimentName: string;
  };
  AIChat: {
    sessionId: number;
    experimentId: number;
    currentStepTitle: string;
    experimentName: string;
  };
  Results: { sessionId: number; experimentId: number };
  StudentDetail: { studentId: number; studentName: string; sessionId?: number };
  JoinSession: undefined;
  LabSessionDetail: { sessionId: number };
};

// ============================================================
// Instructor Portal / Summary types
// ============================================================

export interface StudentSummary {
  student: {
    id: number;
    full_name: string;
    email: string;
    created_at: string | null;
  };
  active_session: {
    session_id: number;
    experiment_id: number;
    experiment_name: string;
    subject: string;
    difficulty: string;
    current_step_number: number;
    total_steps: number;
    started_at: string | null;
    status: string;
    current_step: {
      step_number: number;
      title: string;
      description: string;
      why: string | null;
      safety_warning: string | null;
      checkpoint_required: boolean;
    } | null;
    completed_photos: Array<{
      photo_id: number;
      step_number: number | null;
      step_title: string;
      file_path: string;
      ai_feedback: string | null;
      confidence_score: number | null;
      is_verified: boolean;
      created_at: string | null;
      is_override: boolean;
    }>;
    pending_override: {
      request_id: number;
      step_number: number;
      step_description: string | null;
      image_path: string | null;
      requested_at: string | null;
    } | null;
  } | null;
  experiment_history: Array<{
    experiment_id: number;
    name: string;
    subject: string;
    difficulty: string;
    steps_completed: number;
    total_steps: number;
    duration_minutes: number;
    status: 'completed' | 'abandoned';
    completed_at: string | null;
    accuracy_score: number;
    observations: string;
    checkpoint_photos: Array<{
      photo_id: number;
      step_number: number | null;
      step_title: string;
      file_path: string;
      ai_feedback: string | null;
      confidence_score: number | null;
      is_verified: boolean;
      is_override: boolean;
    }>;
  }>;
  analytics: {
    total_experiments: number;
    average_accuracy: number;
    total_overrides_requested: number;
    total_overrides_approved: number;
    checkpoint_pass_rate: number;
    accuracy_trend: Array<{
      date: string;
      accuracy: number;
      experiment_name: string;
    }>;
    step_completion_rates: Array<{
      experiment_name: string;
      completed: number;
      total: number;
      percentage: number;
    }>;
    checkpoint_breakdown: {
      ai_verified: number;
      instructor_override: number;
      failed: number;
      total: number;
    };
  };
}

export interface CohortStudent {
  student_id: number;
  student_name: string;
  status: 'active' | 'completed' | 'safety_alert' | 'inactive';
  experiment_name: string | null;
  current_step_number: number;
  total_steps: number;
  session_id: number | null;
  vision_status: string;
  alerts_count: number;
  overrides_count: number;
}

export interface CohortSummary {
  stats: {
    total_students: number;
    active_students: number;
    completed_students: number;
    safety_alerts: number;
  };
  cohort: CohortStudent[];
}

// ============================================================
// Lab Session types
// ============================================================

export interface LabSessionListItem {
  session_id: number;
  code: string;
  name: string;
  experiment_name: string;
  experiment_id: number;
  status: 'active' | 'closed';
  created_at: string | null;
  closed_at: string | null;
  student_count: number;
  alert_count: number;
}

export interface LabSessionStudent {
  student_id: number;
  student_name: string;
  enrollment_id: number;
  experiment_session_id: number | null;
  current_step_number: number;
  total_steps: number;
  progress_percent: number;
  status: 'active' | 'completed' | 'safety_alert' | 'not_started' | 'inactive';
  pending_override: {
    request_id: number;
    step_number: number;
    step_description: string | null;
    image_path: string | null;
    requested_at: string | null;
  } | null;
  last_updated: string | null;
}

export interface LabSessionDetail {
  session_id: number;
  code: string;
  name: string;
  experiment_name: string;
  experiment_id: number;
  status: 'active' | 'closed';
  created_at: string | null;
  closed_at: string | null;
  student_count: number;
  alert_count: number;
  students: LabSessionStudent[];
}

export interface MyActiveLabSession {
  enrollment_id: number;
  session_id: number;
  code: string;
  name: string;
  experiment_id: number;
  experiment_name: string;
  experiment_session_id: number | null;
  exp_session_status: string | null;
  current_step_number: number;
  total_steps: number;
  instructor_name?: string;
  student_count?: number;
}

export interface JoinSessionResult {
  enrollment_id: number;
  session_id: number;
  code: string;
  name: string;
  experiment_id: number;
  experiment_name: string;
  experiment_session_id: number | null;
  already_enrolled: boolean;
}

export interface MySession {
  id: number;
  experiment_id: number;
  experiment_name: string;
  experiment_objective: string;
  current_step_number: number;
  total_steps: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

