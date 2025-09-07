#!/bin/bash

# Notion Time Blocking Automation Setup Script
echo "🚀 Setting up Notion Time Blocking Automation..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Project built successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your credentials."
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p logs
echo "✅ Logs directory created"

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Edit .env file with your credentials:"
echo "   - NOTION_API_KEY: Get from https://www.notion.so/my-integrations"
echo "   - NOTION_DATABASE_ID: Get from your Notion database URL"
echo "   - GOOGLE_CALENDAR_CREDENTIALS_PATH: Path to your Google service account JSON"
echo ""
echo "2. Set up Google Calendar service account:"
echo "   - Go to https://console.cloud.google.com/"
echo "   - Enable Google Calendar API"
echo "   - Create service account and download credentials.json"
echo "   - Share your calendar with the service account email"
echo ""
echo "3. Test the application:"
echo "   npm run dev"
echo ""
echo "4. Test the webhook:"
echo "   node test-webhook.js"
echo ""
echo "5. Deploy to Railway or Heroku:"
echo "   - Follow the README.md deployment instructions"
echo ""
echo "📚 For detailed setup instructions, see README.md"

