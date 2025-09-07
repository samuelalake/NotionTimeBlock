import { FocusTypeConfig, WorkHours } from '../types';

export const FOCUS_TYPE_CONFIGS: Record<string, FocusTypeConfig> = {
  'Deep Work': {
    preferred_hours: [9, 10, 11, 12, 13, 14], // 9 AM - 2 PM
    min_duration: 60,
    max_duration: 240,
    preferred_duration: 120,
    requires_buffer: true,
    buffer_before: 15,
    buffer_after: 15,
  },
  'Admin': {
    preferred_hours: [9, 10, 11, 12, 13, 14, 15, 16], // 9 AM - 4 PM
    min_duration: 15,
    max_duration: 90,
    preferred_duration: 30,
    requires_buffer: false,
    buffer_before: 5,
    buffer_after: 5,
  },
  'Calls': {
    preferred_hours: [10, 11, 12, 13, 14, 15], // 10 AM - 3 PM
    min_duration: 15,
    max_duration: 120,
    preferred_duration: 60,
    requires_buffer: true,
    buffer_before: 10,
    buffer_after: 10,
  },
  'Creative': {
    preferred_hours: [9, 10, 11, 12, 13, 14, 15], // 9 AM - 3 PM
    min_duration: 30,
    max_duration: 180,
    preferred_duration: 90,
    requires_buffer: true,
    buffer_before: 10,
    buffer_after: 10,
  },
};

export const PRIORITY_WEIGHTS = {
  'High': 3,
  'Medium': 2,
  'Low': 1,
};

export const PREFERRED_TIME_WEIGHTS = {
  'morning': 1.0,
  'afternoon': 0.8,
  'evening': 0.6,
};

export const DEFAULT_WORK_HOURS: WorkHours = {
  start: parseInt(process.env.WORK_START_HOUR || '9'),
  end: parseInt(process.env.WORK_END_HOUR || '17'),
  timezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
};

export const SCHEDULING_CONFIG = {
  // Look ahead days for scheduling
  max_lookahead_days: 14,
  // Minimum time slot duration to consider
  min_slot_duration: 15,
  // Maximum time slot duration
  max_slot_duration: 480, // 8 hours
  // Buffer time between tasks
  default_buffer: 15,
  // Time to check for conflicts before/after events
  conflict_check_buffer: 5,
};

