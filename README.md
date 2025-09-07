# Notion Time Blocking Automation

A smart time blocking system that automatically schedules your Notion tasks into available calendar slots, similar to Motion but integrated with your existing Notion workspace.

## Features

- **Smart Scheduling**: Automatically finds optimal time slots based on task properties
- **Focus Type Optimization**: Different scheduling rules for Deep Work, Admin, Calls, and Creative tasks
- **Priority-Based Scheduling**: High priority tasks get scheduled first
- **Conflict Detection**: Checks Google Calendar for existing events
- **Flexible Timing**: Tasks can be moved if conflicts exist
- **Notion Integration**: Updates tasks with scheduled time blocks
- **Webhook API**: Triggered by Notion automations

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Notion workspace with a tasks database
- Google Calendar access
- A webhook hosting service (Railway, Heroku, etc.)

### 2. Installation

```bash
# Clone and install dependencies
git clone <your-repo>
cd notion-time-blocking-automation
npm install

# Build the project
npm run build
```

### 3. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Notion Configuration
NOTION_API_KEY=your_notion_integration_token_here
NOTION_DATABASE_ID=your_tasks_database_id_here

# Google Calendar Configuration
GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials.json
GOOGLE_CALENDAR_ID=primary

# Server Configuration
PORT=3000
NODE_ENV=production
DEFAULT_TIMEZONE=America/New_York
WORK_START_HOUR=9
WORK_END_HOUR=17
```

### 4. Notion Setup

#### Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name like "Time Blocking Automation"
4. Select your workspace
5. Copy the "Internal Integration Token"

#### Set Up Your Tasks Database

Your Notion database needs these properties:

**Required Properties:**
- `Name` (Title) - Task name
- `Time Block Start` (Date) - When the task is scheduled to start
- `Time Block End` (Date) - When the task is scheduled to end
- `Scheduling Status` (Select) - Status of scheduling (Scheduled, Conflict, etc.)
- `Scheduling Message` (Text) - Additional scheduling information

**Task Properties for Scheduling:**
- `Estimated Duration` (Number) - Duration in minutes
- `Priority` (Select) - High, Medium, Low
- `Focus Type` (Select) - Deep Work, Admin, Calls, Creative
- `Preferred Times` (Multi-select) - morning, afternoon, evening
- `Due Date` (Date) - When the task is due
- `Buffer Before` (Number) - Buffer time before task (minutes)
- `Buffer After` (Number) - Buffer time after task (minutes)
- `Flexible` (Checkbox) - Whether the task can be moved

#### Share Database with Integration

1. Open your tasks database
2. Click "Share" in the top right
3. Click "Add people, emails, groups, or integrations"
4. Search for your integration name and add it

### 5. Google Calendar Setup

#### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "Service Account"
5. Download the JSON credentials file
6. Save it as `credentials.json` in your project root

#### Share Calendar with Service Account

1. Open Google Calendar
2. Go to Settings → "Share with specific people"
3. Add the service account email (from credentials.json)
4. Give it "See all event details" permission

### 6. Deploy the Application

#### Using Railway (Recommended)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize project: `railway init`
4. Set environment variables: `railway variables set NOTION_API_KEY=your_key`
5. Deploy: `railway up`

#### Using Heroku

1. Install Heroku CLI
2. Create app: `heroku create your-app-name`
3. Set environment variables:
   ```bash
   heroku config:set NOTION_API_KEY=your_key
   heroku config:set NOTION_DATABASE_ID=your_db_id
   # ... set all other variables
   ```
4. Deploy: `git push heroku main`

### 7. Set Up Notion Automation

1. Go to your Notion database
2. Click "Automations" in the top right
3. Create new automation
4. Set trigger: "When a property is updated" → "Estimated Duration" is not empty
5. Set action: "Send webhook"
6. Use your deployed URL: `https://your-app.railway.app/webhook/schedule`
7. Configure the webhook payload:

```json
{
  "task_id": "{{Page ID}}",
  "task_name": "{{Name}}",
  "estimated_duration": "{{Estimated Duration}}",
  "priority": "{{Priority}}",
  "focus_type": "{{Focus Type}}",
  "preferred_times": "{{Preferred Times}}",
  "due_date": "{{Due Date}}",
  "buffer_before": "{{Buffer Before}}",
  "buffer_after": "{{Buffer After}}",
  "flexible": "{{Flexible}}"
}
```

## API Endpoints

### POST /webhook/schedule

Schedules a task based on the provided data.

**Request Body:**
```json
{
  "task_id": "notion_page_id",
  "task_name": "Complete project proposal",
  "estimated_duration": 120,
  "priority": "High",
  "focus_type": "Deep Work",
  "preferred_times": ["morning"],
  "due_date": "2025-08-20",
  "buffer_before": 15,
  "buffer_after": 15,
  "flexible": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task scheduled for Mon, Aug 18, 2025 at 9:00 AM - 11:00 AM",
  "scheduled_time": {
    "start": "2025-08-18T13:00:00.000Z",
    "end": "2025-08-18T15:00:00.000Z"
  },
  "status": "scheduled"
}
```

### GET /webhook/health

Health check endpoint.

## Scheduling Logic

### Focus Type Rules

- **Deep Work**: Morning slots (9 AM - 2 PM), 2+ hour blocks preferred
- **Admin**: Any time during work hours, 30-60 min blocks
- **Calls**: Avoid early morning/late evening (10 AM - 3 PM)
- **Creative**: Morning/afternoon slots (9 AM - 3 PM), 90 min preferred

### Priority Handling

- **High Priority**: Scheduled ASAP, more flexible with timing
- **Medium Priority**: Balanced approach
- **Low Priority**: Scheduled in available slots

### Conflict Resolution

- Checks Google Calendar for existing events
- Accounts for buffer time around meetings
- Suggests alternative slots if conflicts exist
- Updates Notion task with either scheduled time or conflict status

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run with file watching
npm run dev:watch

# Build for production
npm run build

# Start production build
npm start
```

### Testing

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/webhook/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "test-task-123",
    "task_name": "Test Task",
    "estimated_duration": 60,
    "priority": "High",
    "focus_type": "Deep Work",
    "preferred_times": ["morning"],
    "due_date": "2025-08-20",
    "buffer_before": 15,
    "buffer_after": 15,
    "flexible": true
  }'
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check your `.env` file has all required variables
   - Ensure environment variables are set in production

2. **"Notion database validation failed"**
   - Verify your database has all required properties
   - Check that the integration has access to the database

3. **"Failed to retrieve calendar events"**
   - Verify Google Calendar API is enabled
   - Check service account credentials
   - Ensure calendar is shared with service account

4. **"No available time slots found"**
   - Check your work hours configuration
   - Verify calendar has free time
   - Try adjusting task duration or flexibility

### Logs

Check application logs for detailed error information:

```bash
# Local development
npm run dev

# Production (Railway)
railway logs

# Production (Heroku)
heroku logs --tail
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Create an issue in the repository
4. Contact support

---

**Goal**: Motion-level smart scheduling but integrated into your Notion workspace, with full control and no subscription fees.

