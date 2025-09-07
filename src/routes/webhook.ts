import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { TaskData } from '../types';
import { SchedulingService } from '../services/schedulingService';
import { logger } from '../utils/logger';

const router = Router();

// Validation schema for webhook payload
const taskDataSchema = Joi.object({
  task_id: Joi.string().required(),
  task_name: Joi.string().required(),
  estimated_duration: Joi.number().integer().min(1).required(),
  priority: Joi.string().valid('High', 'Medium', 'Low').required(),
  focus_type: Joi.string().valid('Deep Work', 'Admin', 'Calls', 'Creative').required(),
  domain: Joi.string().valid('Work', 'Personal', 'School').optional(),
  preferred_times: Joi.array().items(
    Joi.string().valid('morning', 'afternoon', 'evening')
  ).min(1).required(),
  due_date: Joi.string().isoDate().required(),
  buffer_before: Joi.number().integer().min(0).default(15),
  buffer_after: Joi.number().integer().min(0).default(15),
  flexible: Joi.boolean().default(true),
  created_at: Joi.string().isoDate().optional(),
  last_edited_time: Joi.string().isoDate().optional(), // When the task was created
});

export function createWebhookRouter(schedulingService: SchedulingService | null): Router {
  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'notion-time-blocking-automation',
    });
  });

  // Main webhook endpoint for scheduling tasks
  router.post('/schedule', async (req: Request, res: Response) => {
    try {
      logger.info('Received scheduling request', { body: req.body });

      // Check if scheduling service is available
      if (!schedulingService) {
        logger.error('Scheduling service not available');
        return res.status(503).json({
          success: false,
          error: 'Service unavailable',
          message: 'Scheduling service is not properly initialized. Please check environment variables.',
        });
      }

      // Validate request body
      const { error, value } = taskDataSchema.validate(req.body);
      if (error) {
        logger.warn('Invalid request payload', { error: error.details });
        return res.status(400).json({
          success: false,
          error: 'Invalid request payload',
          details: error.details.map((d: any) => d.message),
        });
      }

      const taskData: TaskData = value;

      // Process the scheduling request
      const result = await schedulingService.scheduleTask(taskData);

      logger.info('Scheduling completed', {
        taskId: taskData.task_id,
        success: result.success,
        status: result.status,
      });

      // Return appropriate response
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          scheduled_time: result.scheduled_time,
          status: result.status,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          status: result.status,
          alternative_slots: result.alternative_slots,
        });
      }
    } catch (error) {
      logger.error('Unexpected error in webhook', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the request',
      });
    }
  });

  // Debug endpoint to fetch a Notion task
  router.get('/debug/task/:taskId', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      logger.info('Debug: Fetching task', { taskId });

      // Check if scheduling service is available
      if (!schedulingService) {
        return res.status(503).json({
          success: false,
          error: 'Service unavailable',
          message: 'Scheduling service is not properly initialized.',
        });
      }

      // Use the Notion service to fetch the task
      const notionService = (schedulingService as any).notionService;
      const task = await notionService.getTask(taskId);

      res.json({
        success: true,
        task: {
          id: task.id,
          url: task.url,
          properties: task.properties,
        },
      });
    } catch (error) {
      logger.error('Debug: Error fetching task', { error, taskId: req.params.taskId });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        taskId: req.params.taskId,
      });
    }
  });

  // Debug endpoint to test updating a Notion task
  router.post('/debug/update', async (req: Request, res: Response) => {
    try {
      const { task_id, test } = req.body;
      logger.info('Debug: Testing task update', { task_id, test });

      // Check if scheduling service is available
      if (!schedulingService) {
        return res.status(503).json({
          success: false,
          error: 'Service unavailable',
          message: 'Scheduling service is not properly initialized.',
        });
      }

      // Use the Notion service to update the task
      const notionService = (schedulingService as any).notionService;
      const success = await notionService.updateTask(task_id, {
        'Scheduling Message': `Test update: ${test}`,
      });

      res.json({
        success,
        message: success ? 'Update successful' : 'Update failed',
      });
    } catch (error) {
      logger.error('Debug: Error updating task', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Test endpoint to verify Google Calendar connection
  router.get('/test/calendar', async (req: Request, res: Response) => {
    try {
      if (!schedulingService) {
        return res.status(503).json({
          success: false,
          error: 'Service unavailable',
          message: 'Scheduling service is not properly initialized.',
        });
      }

      // Get the calendar service from scheduling service
      const calendarService = (schedulingService as any).calendarService;
      
      // Test multiple date ranges to find events
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Test different date ranges
      const todayEvents = await calendarService.getEvents(now, tomorrow);
      const weekEvents = await calendarService.getEvents(now, nextWeek);
      
      // Also test with a broader range (past week to next week)
      const pastWeek = new Date(now);
      pastWeek.setDate(pastWeek.getDate() - 7);
      const allEvents = await calendarService.getEvents(pastWeek, nextWeek);
      
      res.json({
        success: true,
        message: 'Google Calendar connection successful',
        calendar_id: (calendarService as any).calendarId,
        events_summary: {
          today_tomorrow: todayEvents.length,
          next_week: weekEvents.length,
          past_week_to_next_week: allEvents.length,
        },
        events: allEvents.slice(0, 5), // Show first 5 events from broader range
        test_date_ranges: {
          today_tomorrow: {
            start: now.toISOString(),
            end: tomorrow.toISOString(),
          },
          next_week: {
            start: now.toISOString(),
            end: nextWeek.toISOString(),
          },
          broader_range: {
            start: pastWeek.toISOString(),
            end: nextWeek.toISOString(),
          },
        },
        debug_info: {
          current_time: now.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          calendar_service_initialized: !!calendarService,
        },
      });
    } catch (error) {
      logger.error('Error testing calendar connection', { error });
      res.status(500).json({
        success: false,
        error: 'Calendar connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Endpoint to get available time slots (for debugging/testing)
  router.post('/slots', async (req: Request, res: Response) => {
    try {
      const { duration, preferred_times } = req.body;

      if (!duration || !preferred_times) {
        return res.status(400).json({
          success: false,
          error: 'Duration and preferred_times are required',
        });
      }

      // This would require exposing the calendar service method
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Slot checking endpoint - implementation needed',
      });
    } catch (error) {
      logger.error('Error checking available slots', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  return router;
}
