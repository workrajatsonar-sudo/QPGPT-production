
export type Role = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  id: string; // uuid
  full_name: string;
  display_name?: string; // For teachers
  username: string;
  email: string;
  password?: string; // Only for auth handling, not usually stored in state
  role: Role;
  
  // Extended Fields
  grade_year?: string; // e.g. "Class 10"
  level_of_study?: string; // e.g. "High School", "Undergraduate"
  course_stream?: string; // e.g. "Science", "Commerce"
  subjects_of_interest?: string[]; // Array of strings
  exam_type?: string; // e.g. "CBSE", "JEE"
  
  status?: 'active' | 'disabled';
  created_at?: string;
}

export interface Standard {
  id: string; // uuid
  name: string; // e.g. "Class 10"
}

export interface Subject {
  id: string;
  name: string;
  standard_id: string;
}

export interface Medium {
  id: string;
  name: string;
}

export interface Chapter {
  id: string;
  name: string;
  subject_id: string;
  standard_id: string;
}

export interface FileRecord {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: 'pdf' | 'docx' | 'xlsx' | 'jpg' | 'zip' | 'txt';
  size_kb: number;
  uploaded_by: string; // uuid
  created_at: string;
  standard_id?: string;
  subject_id?: string;
  chapter_id?: string;
  medium_id?: string;
  year?: number;
  type?: 'practice' | 'final' | 'mid-term' | 'quiz' | 'other';
  visibility: 'public' | 'teacher' | 'private';
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  admin_feedback?: string;
  download_count: number;
  source?: 'upload' | 'generator'; // Track origin
  
  // Notification fields
  is_seen?: boolean;
  seen_at?: string;

  // Joined fields for UI
  standards?: Standard;
  subjects?: Subject;
  mediums?: Medium;
  chapters?: Chapter;
  users?: UserProfile; // uploader
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface GeneratedPaper {
  id: string;
  title: string;
  generated_by: string;
  standard_id: string;
  subject_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_feedback?: string;
  created_at: string;
  content_json: any;
  
  // Joined
  users?: UserProfile;
  standards?: Standard;
  subjects?: Subject;
}

export interface RecentActivity {
  id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
}

export interface SearchLog {
  id: string;
  query: string;
  user_id?: string;
  filters_json: any;
  created_at: string;
}

export interface AdminLog {
    id: string;
    admin_id: string;
    action_type: 'approve' | 'reject' | 'modify' | 'create';
    target_type: 'file' | 'paper' | 'user' | 'settings' | 'standard' | 'subject';
    target_id?: string;
    target_key?: string;
    details?: string;
    created_at: string;
}

export interface DashboardStats {
  totalFiles: number;
  totalDownloads: number;
  totalSearches: number;
  activeUsers: number;
}

// --- New App Settings Interface ---
export interface AppSettings {
  id: string;
  platform_name: string;
  support_email: string;
  maintenance_mode: boolean;
  generator_strict_mode: boolean;
  max_questions: number;
  allow_pdf_input: boolean;
  allow_text_input: boolean;
  qpgpt_enabled: boolean;
  qpgpt_auto_suggest_upload: boolean;
  qpgpt_search_scope: 'approved_only' | 'include_pending';
  generator_requires_approval: boolean;
  auto_publish_admin_generated: boolean;
  max_pdf_size_mb: number;
  allowed_file_types: string[];
  theme: 'white' | 'black' | 'space';
  updated_by?: string;
  updated_at?: string;
}
