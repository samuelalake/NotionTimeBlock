# Vercel Deployment Guide

## Environment Variables Setup

To deploy this serverless function to Vercel, you need to configure the following environment variables in your Vercel project settings:

### Required Environment Variables

1. **NOTION_API_KEY**
   - Your Notion integration token
   - Get this from https://www.notion.so/my-integrations

2. **NOTION_DATABASE_ID**
   - The ID of your Notion database containing tasks
   - Extract from the database URL

3. **GOOGLE_CALENDAR_CREDENTIALS** (for Vercel)
   - JSON string of your Google Service Account credentials
   - Copy the entire JSON content from your service account key file
   - Example: `{"type":"service_account","project_id":"your-project",...}`

4. **GOOGLE_CALENDAR_ID** (optional)
   - Default: "primary"
   - The calendar ID to schedule events in

### Optional Environment Variables

- **NODE_ENV**: Set to "production" for Vercel
- **LOG_LEVEL**: Set to "info" or "error" for production
- **DEFAULT_TIMEZONE**: Your timezone (default: "America/New_York")
- **WORK_START_HOUR**: Work start hour in 24h format (default: 9)
- **WORK_END_HOUR**: Work end hour in 24h format (default: 17)

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Create Service Account
   - Download the JSON key file
5. Share your calendar with the service account email
6. Copy the JSON content and paste it as `GOOGLE_CALENDAR_CREDENTIALS` in Vercel

## Deployment Steps

1. **Connect your repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

## Testing the Deployment

After deployment, test these endpoints:

- **Health Check**: `GET https://your-app.vercel.app/webhook/health`
- **Root**: `GET https://your-app.vercel.app/`

## Troubleshooting

### 500 Internal Server Error

If you get a 500 error, check:

1. **Environment Variables**: Ensure all required variables are set
2. **Google Calendar Credentials**: Make sure the JSON is valid and properly formatted
3. **Notion API Key**: Verify the integration token is correct
4. **Database ID**: Ensure the Notion database ID is correct

### Service Unavailable (503)

This means the services failed to initialize. Check the Vercel function logs for specific error messages.

### Common Issues

1. **Invalid JSON in GOOGLE_CALENDAR_CREDENTIALS**: Make sure there are no line breaks or extra spaces
2. **Notion permissions**: Ensure your integration has access to the database
3. **Calendar permissions**: Make sure the service account has access to your calendar

## Local Development

For local development, use:
- `GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials.json` (file path)
- `NODE_ENV=development`

## API Endpoints

- `POST /webhook/schedule` - Schedule a task
- `GET /webhook/health` - Health check
- `GET /webhook/debug/task/:taskId` - Debug: Get task details
- `POST /webhook/debug/update` - Debug: Update task
- `POST /webhook/slots` - Get available time slots
