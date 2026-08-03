export type FeedbackType = 
  | 'BUG' 
  | 'FEATURE_REQUEST' 
  | 'GENERAL_FEEDBACK' 
  | 'SUPPORT' 
  | 'PRIVACY' 
  | 'SECURITY' 
  | 'OTHER';

export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeedbackStatus = 'NEW' | 'TRIAGED' | 'INVESTIGATING' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED' | 'DUPLICATE' | 'REJECTED';

export interface UserFeedbackAttachment {
  id: number;
  feedback: number;
  file: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface UserFeedbackComment {
  id: number;
  author: number;
  author_name: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface UserFeedbackStatusHistory {
  id: number;
  changed_by: number;
  changed_by_name: string;
  previous_status: FeedbackStatus;
  new_status: FeedbackStatus;
  comment: string;
  created_at: string;
}

export interface UserFeedback {
  id: number;
  type: FeedbackType;
  module: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  title: string;
  description: string;
  page_url?: string;
  browser?: string;
  os?: string;
  user_agent?: string;
  app_version?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  attachments: UserFeedbackAttachment[];
  comments: UserFeedbackComment[];
  status_history: UserFeedbackStatusHistory[];
}

export interface CreateFeedbackPayload {
  type: FeedbackType;
  module: string;
  priority: FeedbackPriority;
  title: string;
  description: string;
  page_url?: string;
  browser?: string;
  os?: string;
  user_agent?: string;
}
