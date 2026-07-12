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

export interface Test {
  id: string;
  name: string;
  type: string; // chapterwise, full length, etc.
  subject: string; // Subject name or subject UUID
  topics: string[]; // List of topic names or UUIDs
  sub_topics?: string[]; // List of sub-topic names or UUIDs
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  total_time: number; // in minutes
  total_marks: number;
  total_questions: number;
  status: 'draft' | 'live' | 'scheduled' | null;
  questions?: string[]; // Array of question IDs associated with this test
  created_at: string;
  schedule_date?: string;
  schedule_time?: string;
  live_until?: string;
  end_date?: string;
  end_time?: string;
}

export interface Question {
  id?: string;
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  test_id: string;
  topic_id?: string;
  sub_topic_id?: string;
  media_url?: string;
  created_at?: string;
}

// API generic envelope
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Login API response structure
export interface LoginData {
  token: string;
  user: {
    id: string;
    username: string;
    role?: string;
    [key: string]: any;
  };
}
