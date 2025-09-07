// Test script for the webhook endpoint
// Run with: node test-webhook.js

const testWebhook = async () => {
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook/schedule';
  
  const testTask = {
    task_id: 'test-task-' + Date.now(),
    task_name: 'Test Deep Work Task',
    estimated_duration: 120,
    priority: 'High',
    focus_type: 'Deep Work',
    preferred_times: ['morning'],
    due_date: '2025-08-20',
    buffer_before: 15,
    buffer_after: 15,
    flexible: true
  };

  try {
    console.log('Testing webhook with task:', testTask);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testTask)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Test passed! Task scheduled successfully.');
    } else {
      console.log('❌ Test failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

// Health check test
const testHealth = async () => {
  const healthUrl = process.env.HEALTH_URL || 'http://localhost:3000/webhook/health';
  
  try {
    const response = await fetch(healthUrl);
    const result = await response.json();
    
    console.log('Health check response:', JSON.stringify(result, null, 2));
    
    if (result.status === 'healthy') {
      console.log('✅ Health check passed!');
    } else {
      console.log('❌ Health check failed!');
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
  }
};

// Run tests
const runTests = async () => {
  console.log('🧪 Running webhook tests...\n');
  
  await testHealth();
  console.log('');
  await testWebhook();
};

runTests();

