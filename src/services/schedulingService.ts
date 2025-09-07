import { TaskData, SchedulingResult, TimeSlot } from '../types';
import { CalendarService } from './calendarService';
import { NotionService } from './notionService';
import { FOCUS_TYPE_CONFIGS, PRIORITY_WEIGHTS, PREFERRED_TIME_WEIGHTS } from '../config';
import { logger } from '../utils/logger';
import moment from 'moment-timezone';

export class SchedulingService {
  private calendarService: CalendarService;
  private notionService: NotionService;

  constructor(calendarService: CalendarService, notionService: NotionService) {
    this.calendarService = calendarService;
    this.notionService = notionService;
  }

  /**
   * Main scheduling function that processes a task and finds optimal time slot
   */
  async scheduleTask(taskData: TaskData): Promise<SchedulingResult> {
    try {
      logger.info('Starting task scheduling', { taskId: taskData.task_id });

      // Validate task data
      const validation = this.validateTaskData(taskData);
      if (!validation.valid) {
        return {
          success: false,
          status: 'error',
          message: validation.message || 'Task validation failed',
        };
      }

      // Get focus type configuration
      const focusConfig = FOCUS_TYPE_CONFIGS[taskData.focus_type];
      if (!focusConfig) {
        return {
          success: false,
          status: 'error',
          message: `Unknown focus type: ${taskData.focus_type}`,
        };
      }

      // Calculate urgency based on due date and priority
      const urgency = this.calculateUrgency(taskData);

      // Find optimal time slots
      const timeSlots = await this.findOptimalTimeSlots(taskData, focusConfig);

      if (timeSlots.length === 0) {
        return {
          success: false,
          status: 'no_slots',
          message: 'No available time slots found for this task',
        };
      }

      // Select the best slot
      const bestSlot = this.selectBestSlot(timeSlots, taskData, urgency);

      if (!bestSlot) {
        return {
          success: false,
          status: 'no_slots',
          message: 'No suitable time slots found for this task',
          alternative_slots: timeSlots.slice(0, 3), // Return top 3 alternatives
        };
      }

      // Validate that the scheduled time is in the future
      const timeValidation = this.validateScheduledTime(bestSlot.start);
      if (!timeValidation.valid) {
        return {
          success: false,
          status: 'error',
          message: timeValidation.message || 'Scheduled time validation failed',
        };
      }

      // Update Notion task with scheduled time
      const updateSuccess = await this.notionService.updateTask(
        taskData.task_id,
        {
          'Time Block Start': bestSlot.start.toISOString(),
          'Time Block End': bestSlot.end.toISOString(),
          'Scheduling Status': 'Scheduled',
          'Scheduling Message': `Scheduled for ${this.formatTimeSlot(bestSlot)}`,
        }
      );

      if (!updateSuccess) {
        return {
          success: false,
          status: 'error',
          message: 'Failed to update Notion task with scheduled time',
        };
      }

      logger.info('Task scheduled successfully', {
        taskId: taskData.task_id,
        scheduledTime: bestSlot.start.toISOString(),
      });

      return {
        success: true,
        scheduled_time: {
          start: bestSlot.start,
          end: bestSlot.end,
        },
        status: 'scheduled',
        message: `Task scheduled for ${this.formatTimeSlot(bestSlot)}`,
      };
    } catch (error) {
      logger.error('Error scheduling task', { error, taskId: taskData.task_id });
      return {
        success: false,
        status: 'error',
        message: `Scheduling error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Find optimal time slots for a task
   */
  private async findOptimalTimeSlots(
    taskData: TaskData,
    focusConfig: any
  ): Promise<TimeSlot[]> {
    const duration = Math.max(
      taskData.estimated_duration,
      focusConfig.min_duration
    );

    // Convert preferred times to hours
    const preferredHours = this.convertPreferredTimesToHours(
      taskData.preferred_times,
      taskData.domain
    );

    // Find available slots
    const slots = await this.calendarService.findAvailableSlots(
      new Date(),
      this.getMaxSchedulingDate(),
      duration,
      preferredHours
    );

    // Filter and score slots based on task requirements
    return this.filterAndScoreSlots(slots, taskData, focusConfig);
  }

  /**
   * Convert preferred time strings to hour numbers
   */
  private convertPreferredTimesToHours(
    preferredTimes: string[],
    domain?: string
  ): number[] {
    const timeMapping: Record<string, number[]> = {
      morning: [9, 10, 11, 12],
      afternoon: [13, 14, 15, 16],
      evening: [17, 18, 19],
    };

    const hours: number[] = [];
    preferredTimes.forEach(time => {
      if (timeMapping[time]) {
        hours.push(...timeMapping[time]);
      }
    });

    // If no preferred times or domain is Work, default to work hours
    if (hours.length === 0 || domain === 'Work') {
      return [9, 10, 11, 12, 13, 14, 15, 16]; // 9 AM - 4 PM
    }

    // For Personal/School, allow more flexible hours
    return hours.length > 0 ? hours : [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  }

  /**
   * Filter and score time slots based on task requirements
   */
  private filterAndScoreSlots(
    slots: TimeSlot[],
    taskData: TaskData,
    focusConfig: any
  ): TimeSlot[] {
    return slots
      .filter(slot => {
        // Check duration requirements
        if (slot.duration < focusConfig.min_duration) return false;
        if (slot.duration > focusConfig.max_duration) return false;

        // Check if slot is in preferred hours
        const slotHour = slot.start.getHours();
        const isPreferredHour = focusConfig.preferred_hours.includes(slotHour);

        // For high priority tasks, be more flexible
        if (taskData.priority === 'High') return true;

        // For other tasks, prefer slots in preferred hours
        return isPreferredHour || taskData.flexible;
      })
      .map(slot => ({
        ...slot,
        quality: this.calculateSlotQuality(slot, taskData, focusConfig),
      }))
      .sort((a, b) => {
        // Sort by quality first, then by time
        const qualityOrder = { excellent: 4, good: 3, acceptable: 2, poor: 1 };
        const aQuality = qualityOrder[a.quality];
        const bQuality = qualityOrder[b.quality];

        if (aQuality !== bQuality) {
          return bQuality - aQuality;
        }

        return a.start.getTime() - b.start.getTime();
      });
  }

  /**
   * Calculate slot quality based on task requirements
   */
  private calculateSlotQuality(
    slot: TimeSlot,
    taskData: TaskData,
    focusConfig: any
  ): 'excellent' | 'good' | 'acceptable' | 'poor' {
    let quality = 'acceptable';

    const slotHour = slot.start.getHours();
    const isPreferredHour = focusConfig.preferred_hours.includes(slotHour);

    // Base quality on preferred hours
    if (isPreferredHour) {
      quality = 'excellent';
    } else if (focusConfig.preferred_hours.some((h: number) => Math.abs(h - slotHour) <= 1)) {
      quality = 'good';
    }

    // Adjust based on task characteristics
    if (taskData.focus_type === 'Deep Work' && slot.duration >= 120) {
      quality = quality === 'excellent' ? 'excellent' : 'good';
    }

    if (taskData.priority === 'High') {
      quality = quality === 'poor' ? 'acceptable' : quality;
    }

    // Boost quality for fresh tasks (created recently)
    if (taskData.created_at) {
      const createdTime = new Date(taskData.created_at);
      const hoursSinceCreation = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation < 1) {
        // Very fresh task - boost quality
        if (quality === 'acceptable') quality = 'good';
        else if (quality === 'good') quality = 'excellent';
      }
    }

    // Boost quality for recently edited tasks
    if (taskData.last_edited_time) {
      const editedTime = new Date(taskData.last_edited_time);
      const hoursSinceEdit = (Date.now() - editedTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceEdit < 1) {
        // Recently edited - slight quality boost
        if (quality === 'acceptable') quality = 'good';
      }
    }

    return quality as 'excellent' | 'good' | 'acceptable' | 'poor';
  }

  /**
   * Select the best slot from available options
   */
  private selectBestSlot(
    slots: TimeSlot[],
    taskData: TaskData,
    urgency: number
  ): TimeSlot | null {
    if (slots.length === 0) return null;

    // For high urgency tasks, take the earliest good slot
    if (urgency > 0.8) {
      const goodSlots = slots.filter(s => s.quality === 'excellent' || s.quality === 'good');
      return goodSlots.length > 0 ? goodSlots[0] : slots[0];
    }

    // For normal tasks, take the best quality slot
    return slots[0];
  }

  /**
   * Calculate urgency based on due date and priority
   */
  private calculateUrgency(taskData: TaskData): number {
    const now = moment();
    const dueDate = moment(taskData.due_date);
    const daysUntilDue = dueDate.diff(now, 'days');

    let urgency = 0;

    // Priority weight
    urgency += PRIORITY_WEIGHTS[taskData.priority] * 0.3;

    // Time urgency
    if (daysUntilDue <= 0) {
      urgency += 1.0; // Overdue
    } else if (daysUntilDue <= 1) {
      urgency += 0.8; // Due today or tomorrow
    } else if (daysUntilDue <= 3) {
      urgency += 0.6; // Due this week
    } else if (daysUntilDue <= 7) {
      urgency += 0.4; // Due next week
    }

    return Math.min(urgency, 1.0);
  }

  /**
   * Validate task data
   */
  private validateTaskData(taskData: TaskData): { valid: boolean; message?: string } {
    if (!taskData.task_id) {
      return { valid: false, message: 'Task ID is required' };
    }

    if (!taskData.estimated_duration || taskData.estimated_duration <= 0) {
      return { valid: false, message: 'Valid estimated duration is required' };
    }

    if (!taskData.priority || !['High', 'Medium', 'Low'].includes(taskData.priority)) {
      return { valid: false, message: 'Valid priority is required' };
    }

    if (!taskData.focus_type || !FOCUS_TYPE_CONFIGS[taskData.focus_type]) {
      return { valid: false, message: 'Valid focus type is required' };
    }

    return { valid: true };
  }

  /**
   * Validate that a scheduled time is in the future
   */
  private validateScheduledTime(scheduledTime: Date): { valid: boolean; message?: string } {
    const now = new Date();
    const minScheduledTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    if (scheduledTime < minScheduledTime) {
      return { 
        valid: false, 
        message: `Scheduled time ${scheduledTime.toISOString()} is too soon. Minimum scheduling time is 30 minutes from now.` 
      };
    }

    return { valid: true };
  }

  /**
   * Get maximum scheduling date
   */
  private getMaxSchedulingDate(): Date {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14); // 2 weeks ahead
    return maxDate;
  }

  /**
   * Format time slot for display
   */
  private formatTimeSlot(slot: TimeSlot): string {
    const start = moment(slot.start).format('MMM D, YYYY [at] h:mm A');
    const end = moment(slot.end).format('h:mm A');
    return `${start} - ${end}`;
  }
}
