#!/bin/bash

# Quick start script for Fabula Docker setup

set -e

echo "🚀 Starting Fabula Docker Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env and add your OPENROUTER_API_KEY before continuing!"
    echo "   Run: nano .env"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
fi

# Check if OPENROUTER_API_KEY is set
if grep -q "OPENROUTER_API_KEY=your-openrouter-api-key-here" .env; then
    echo "⚠️  Warning: OPENROUTER_API_KEY is not set in .env"
    echo "   LLM features will not work without a valid API key."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build and start services
echo "🔨 Building Docker images..."
docker compose build

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if backend is healthy
echo "🔍 Checking backend health..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend is not ready yet. It may still be starting up."
    echo "   Check logs with: docker compose logs backend"
fi

# Run migrations
echo "🗄️  Running database migrations..."
docker compose exec backend alembic upgrade head

# Ask if user wants to create admin
echo ""
read -p "Would you like to create an admin user? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Admin email (default: admin@fabula.com): " email
    email=${email:-admin@fabula.com}
    
    read -p "Admin password (default: Admin123): " password
    password=${password:-Admin123}
    
    read -p "Admin name (default: Admin): " name
    name=${name:-Admin}
    
    echo "👤 Creating admin user..."
    docker compose exec backend env ADMIN_EMAIL="$email" ADMIN_PASSWORD="$password" ADMIN_NAME="$name" python scripts/seed_admin.py
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker compose logs -f"
echo "   Stop services: docker compose down"
echo "   Restart services: docker compose restart"
echo ""
