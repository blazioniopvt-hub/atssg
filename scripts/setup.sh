#!/bin/bash
# Development setup script for SkillSync

set -e

echo "🚀 Setting up SkillSync development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ is required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check npm version
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Database services will not be available."
else
    echo "✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) detected"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Copy environment file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
fi

# Start Docker services if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Starting infrastructure services..."
    docker-compose -f infrastructure/docker/docker-compose.yml up -d
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Check if PostgreSQL is ready
    for i in {1..30}; do
        if docker exec skillsync-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo "✅ PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ PostgreSQL failed to start in time"
            exit 1
        fi
        sleep 1
    done
fi

# Generate Prisma client (when schema is ready)
# echo "🔧 Generating Prisma client..."
# npm run db:generate

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Run 'npm run dev' to start development servers"
echo "  3. Open http://localhost:3000 for the web app"
echo "  4. Open http://localhost:4000 for the API"
echo ""