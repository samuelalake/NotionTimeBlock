export interface TaskData {
  task_id: string;
  task_name: string;
  estimated_duration: number; // in minutes
  priority: 'High' | 'Medium' | 'Low';
  focus_type: 'Deep Work' | 'Admin' | 'Calls' | 'Creative';
  domain?: 'Work' | 'Personal' | 'School'; // Optional domain field
  preferred_times: ('morning' | 'afternoon' | 'evening')[];
  due_date: string; // ISO date string
  buffer_before: number; // in minutes
  buffer_after: number; // in minutes
  flexible: boolean;
  created_at?: string; // ISO date string - when the task was created
  last_edited_time?: string; // ISO date string - when the task was last modified
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // in minutes
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  conflicts: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface SchedulingResult {
  success: boolean;
  scheduled_time?: {
    start: Date;
    end: Date;
  };
  status: 'scheduled' | 'conflict' | 'no_slots' | 'error';
  message: string;
  alternative_slots?: TimeSlot[];
}

export interface NotionTaskUpdate {
  'Time Block Start'?: string; // ISO datetime string
  'Time Block End'?: string; // ISO datetime string
  'Scheduling Status'?: string;
  'Scheduling Message'?: string;
}

export interface WorkHours {
  start: number; // hour in 24h format
  end: number; // hour in 24h format
  timezone: string;
}

export interface FocusTypeConfig {
  preferred_hours: number[]; // hours of day when this focus type works best
  min_duration: number; // minimum duration in minutes
  max_duration: number; // maximum duration in minutes
  preferred_duration: number; // preferred duration in minutes
  requires_buffer: boolean;
  buffer_before: number;
  buffer_after: number;
}

