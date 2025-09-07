import { google, calendar_v3 } from 'googleapis';
import { CalendarEvent, TimeSlot } from '../types';
import { logger } from '../utils/logger';
import { DEFAULT_WORK_HOURS, SCHEDULING_CONFIG } from '../config';

export class CalendarService {
  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  constructor(credentials: string, calendarId: string) {
    let auth: any;

    try {
      // Check if credentials is a JSON string (for Vercel environment variables)
      if (credentials.startsWith('{')) {
        const credentialsObj = JSON.parse(credentials);
        auth = new google.auth.GoogleAuth({
          credentials: credentialsObj,
          scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });
      } else {
        // Assume it's a file path (for local development)
        auth = new google.auth.GoogleAuth({
          keyFile: credentials,
          scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });
      }
    } catch (error) {
      logger.error('Failed to initialize Google Calendar auth', { error });
      throw new Error('Invalid Google Calendar credentials format');
    }

    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = calendarId;
  }

  /**
   * Get events from Google Calendar for a specific time range
   */
  async getEvents(startTime: Date, endTime: Date): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events: CalendarEvent[] = (response.data.items || []).map((event: any) => ({
        id: event.id || '',
        summary: event.summary || 'Untitled Event',
        start: new Date(event.start?.dateTime || event.start?.date || ''),
        end: new Date(event.end?.dateTime || event.end?.date || ''),
        allDay: !event.start?.dateTime,
      }));

      logger.info(`Retrieved ${events.length} events from calendar`, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      return events;
    } catch (error) {
      logger.error('Failed to retrieve calendar events', { error });
      throw error;
    }
  }

  /**
   * Check if a time slot conflicts with existing events
   */
  async checkConflicts(
    startTime: Date,
    endTime: Date,
    bufferMinutes: number = SCHEDULING_CONFIG.conflict_check_buffer
  ): Promise<{ hasConflicts: boolean; conflictingEvents: CalendarEvent[] }> {
    const bufferStart = new Date(startTime.getTime() - bufferMinutes * 60000);
    const bufferEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

    const events = await this.getEvents(bufferStart, bufferEnd);

    const conflictingEvents = events.filter(event => {
      // Skip all-day events for now (could be enhanced later)
      if (event.allDay) return false;

      const eventStart = event.start;
      const eventEnd = event.end;

      // Check for overlap
      return (
        (eventStart < endTime && eventEnd > startTime) ||
        (eventStart < bufferEnd && eventEnd > bufferStart)
      );
    });

    return {
      hasConflicts: conflictingEvents.length > 0,
      conflictingEvents,
    };
  }

  /**
   * Find available time slots within work hours
   */
  async findAvailableSlots(
    startDate: Date,
    endDate: Date,
    duration: number,
    preferredHours: number[] = []
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const daySlots = await this.findSlotsForDay(
        currentDate,
        duration,
        preferredHours
      );
      slots.push(...daySlots);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by quality and time
    return slots.sort((a, b) => {
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
   * Find available slots for a specific day
   */
  private async findSlotsForDay(
    date: Date,
    duration: number,
    preferredHours: number[]
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const now = new Date();
    
    // Don't schedule for past dates
    if (date < now) {
      return slots;
    }

    const workStart = new Date(date);
    workStart.setHours(DEFAULT_WORK_HOURS.start, 0, 0, 0);

    const workEnd = new Date(date);
    workEnd.setHours(DEFAULT_WORK_HOURS.end, 0, 0, 0);

    // If it's today, start from current time + 1 hour (minimum buffer)
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      const minStartTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      if (minStartTime > workStart) {
        workStart.setTime(minStartTime.getTime());
      }
    }

    // Get events for the day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await this.getEvents(dayStart, dayEnd);

    // Create time slots between work hours
    const slotDuration = 30; // Check every 30 minutes
    let currentTime = new Date(workStart);

    while (currentTime < workEnd) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);

      // Skip if slot goes beyond work hours
      if (slotEnd > workEnd) {
        break;
      }

      // Check for conflicts
      const { hasConflicts, conflictingEvents } = await this.checkConflicts(
        currentTime,
        slotEnd
      );

      if (!hasConflicts) {
        const quality = this.calculateSlotQuality(
          currentTime,
          preferredHours,
          duration
        );

        slots.push({
          start: new Date(currentTime),
          end: new Date(slotEnd),
          duration,
          quality,
          conflicts: false,
        });
      }

      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
    }

    return slots;
  }

  /**
   * Calculate the quality of a time slot based on preferences
   */
  private calculateSlotQuality(
    startTime: Date,
    preferredHours: number[],
    duration: number
  ): 'excellent' | 'good' | 'acceptable' | 'poor' {
    const hour = startTime.getHours();
    let quality = 'acceptable';

    // Check if it's in preferred hours
    if (preferredHours.includes(hour)) {
      quality = 'excellent';
    } else if (preferredHours.some(h => Math.abs(h - hour) <= 1)) {
      quality = 'good';
    }

    // Adjust based on duration
    if (duration >= 120 && hour >= 9 && hour <= 14) {
      // Long tasks in morning/early afternoon
      quality = quality === 'excellent' ? 'excellent' : 'good';
    } else if (duration <= 30 && hour >= 15) {
      // Short tasks in late afternoon
      quality = quality === 'poor' ? 'poor' : 'acceptable';
    }

    return quality as 'excellent' | 'good' | 'acceptable' | 'poor';
  }

  /**
   * Get the next available time slot
   */
  async getNextAvailableSlot(
    duration: number,
    preferredHours: number[] = [],
    maxDays: number = SCHEDULING_CONFIG.max_lookahead_days
  ): Promise<TimeSlot | null> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + maxDays);

    const slots = await this.findAvailableSlots(
      startDate,
      endDate,
      duration,
      preferredHours
    );

    return slots.length > 0 ? slots[0] : null;
  }
}
