# Notion Automation Setup Guide

This guide will help you set up the Notion automation that triggers the time blocking webhook.

## Prerequisites

- ✅ Notion workspace with admin access
- ✅ Time blocking automation deployed and running
- ✅ Tasks database with required properties

## Step 1: Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"New integration"**
3. Fill in the details:
   - **Name**: `Time Blocking Automation`
   - **Logo**: (optional) Upload a custom logo
   - **Associated workspace**: Select your workspace
4. Click **"Submit"**
5. Copy the **"Internal Integration Token"** (starts with `secret_`)
6. Add this token to your `.env` file as `NOTION_API_KEY`

## Step 2: Set Up Your Tasks Database

### Required Database Properties

Your Notion database must have these properties for the automation to work:

#### Core Properties (Required)
- **Name** (Title) - The task name
- **Time Block Start** (Date) - When the task is scheduled to start
- **Time Block End** (Date) - When the task is scheduled to end  
- **Scheduling Status** (Select) - Status of scheduling
  - Options: `Scheduled`, `Conflict`, `No Slots`, `Error`
- **Scheduling Message** (Text) - Additional scheduling information

#### Task Properties (For Scheduling Logic)
- **Estimated Duration** (Number) - Duration in minutes
- **Priority** (Select) - Task priority
  - Options: `High`, `Medium`, `Low`
- **Focus Type** (Select) - Type of work
  - Options: `Deep Work`, `Admin`, `Calls`, `Creative`
- **Preferred Times** (Multi-select) - When you prefer to work
  - Options: `morning`, `afternoon`, `evening`
- **Due Date** (Date) - When the task is due
- **Buffer Before** (Number) - Buffer time before task (minutes)
- **Buffer After** (Number) - Buffer time after task (minutes)
- **Flexible** (Checkbox) - Whether the task can be moved

### Creating the Properties

1. Open your tasks database
2. Click the **"+"** button next to the last property
3. Add each property with the exact names and types listed above
4. For Select properties, add the options as specified

## Step 3: Share Database with Integration

1. Open your tasks database
2. Click **"Share"** in the top right corner
3. Click **"Add people, emails, groups, or integrations"**
4. Search for **"Time Blocking Automation"** (your integration name)
5. Select it and click **"Add"**
6. Make sure it has **"Can edit"** permissions

## Step 4: Create the Automation

1. In your tasks database, click **"Automations"** in the top right
2. Click **"Create automation"**
3. Choose **"Custom"** automation

### Configure the Trigger

1. **Trigger**: Select **"When a property is updated"**
2. **Property**: Select **"Estimated Duration"**
3. **Condition**: Select **"is not empty"**
4. Click **"Continue"**

### Configure the Action

1. **Action**: Select **"Send webhook"**
2. **Webhook URL**: Enter your deployed webhook URL:
   ```
   https://your-app.railway.app/webhook/schedule
   ```
   or
   ```
   https://your-app.herokuapp.com/webhook/schedule
   ```

3. **Method**: Select **"POST"**
4. **Headers**: Add:
   ```
   Content-Type: application/json
   ```

5. **Body**: Use this JSON template:
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

6. Click **"Continue"**

### Test the Automation

1. Click **"Test automation"**
2. Select a test page from your database
3. Click **"Run test"**
4. Check if the webhook was called successfully

### Activate the Automation

1. Give your automation a name: **"Auto Schedule Tasks"**
2. Click **"Turn on"**
3. The automation is now active!

## Step 5: Test the Complete Flow

1. Create a new task in your database
2. Fill in the required properties:
   - **Name**: "Test Deep Work Task"
   - **Estimated Duration**: 120
   - **Priority**: High
   - **Focus Type**: Deep Work
   - **Preferred Times**: morning
   - **Due Date**: Tomorrow's date
   - **Buffer Before**: 15
   - **Buffer After**: 15
   - **Flexible**: ✓

3. Save the task
4. The automation should trigger and schedule the task
5. Check the **"Time Block Start"** and **"Time Block End"** properties

## Troubleshooting

### Automation Not Triggering

- ✅ Check that the trigger property is set correctly
- ✅ Verify the webhook URL is correct and accessible
- ✅ Ensure the task has all required properties filled

### Webhook Errors

- ✅ Check your server logs for error messages
- ✅ Verify all environment variables are set correctly
- ✅ Test the webhook manually using the test script

### Scheduling Issues

- ✅ Ensure your Google Calendar is properly configured
- ✅ Check that you have free time slots in your calendar
- ✅ Verify the task duration is reasonable (15+ minutes)

### Notion Integration Issues

- ✅ Verify the integration token is correct
- ✅ Check that the database is shared with the integration
- ✅ Ensure all required properties exist with correct names

## Advanced Configuration

### Multiple Triggers

You can create additional automations for different triggers:

- **When Priority is updated** - Reschedule high priority tasks
- **When Due Date is updated** - Adjust scheduling based on urgency
- **When Focus Type is updated** - Re-optimize time slots

### Custom Webhook Payloads

You can customize the webhook payload to include additional task properties:

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
  "flexible": "{{Flexible}}",
  "project": "{{Project}}",
  "tags": "{{Tags}}",
  "notes": "{{Notes}}"
}
```

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify all configuration steps were completed correctly
3. Test individual components (Notion API, Google Calendar, webhook)
4. Create an issue in the repository with error details

---

**Next Steps**: Once your automation is working, you can start using it to automatically schedule your tasks! The system will find optimal time slots based on your preferences and calendar availability.

