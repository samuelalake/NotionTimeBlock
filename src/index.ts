import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { NotionService } from './services/notionService';
import { CalendarService } from './services/calendarService';
import { SchedulingService } from './services/schedulingService';
import { createWebhookRouter } from './routes/webhook';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

async function initializeServices() {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'NOTION_API_KEY',
      'NOTION_DATABASE_ID',
      'GOOGLE_CALENDAR_CREDENTIALS_PATH',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize services
    const notionService = new NotionService(
      process.env.NOTION_API_KEY!,
      process.env.NOTION_DATABASE_ID!
    );

    const calendarService = new CalendarService(
      process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH!,
      process.env.GOOGLE_CALENDAR_ID || 'primary'
    );

    const schedulingService = new SchedulingService(calendarService, notionService);

    // Validate Notion database
    const isDatabaseValid = await notionService.validateDatabase();
    if (!isDatabaseValid) {
      logger.warn('Notion database validation failed - some features may not work correctly');
    }

    // Set up routes
    app.use('/webhook', createWebhookRouter(schedulingService));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        message: 'Notion Time Blocking Automation API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/webhook/health',
          schedule: '/webhook/schedule',
          slots: '/webhook/slots',
        },
      });
    });

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', { error: err.message, stack: err.stack });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
      });
    });

    logger.info('Services initialized successfully');
    return { notionService, calendarService, schedulingService };
  } catch (error) {
    logger.error('Failed to initialize services', { error });
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    await initializeServices();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the application
startServer();

