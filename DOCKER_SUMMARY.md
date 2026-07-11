# Docker Setup Summary

## Overview

The Fabula application has been fully containerized using Docker and Docker Compose. This setup includes:

- **Backend**: FastAPI application with Python 3.14
- **Frontend**: React application served by Nginx
- **Database**: PostgreSQL 16

## Files Created/Modified

### New Files

1. **Dockerfile** (root)
   - Backend container configuration
   - Python 3.14 slim image
   - Installs dependencies and runs uvicorn

2. **client/Dockerfile**
   - Multi-stage build for frontend
   - Build stage: Node 20 with Vite
   - Production stage: Nginx Alpine

3. **client/nginx.conf**
   - Nginx configuration for React SPA
   - Handles client-side routing
   - Proxies `/api/` requests to backend

4. **.dockerignore** (root)
   - Excludes unnecessary files from backend build
   - Reduces image size

5. **client/.dockerignore**
   - Excludes unnecessary files from frontend build

6. **.env.docker**
   - Template for Docker environment variables
   - Documented configuration options

7. **DOCKER_SETUP.md**
   - Comprehensive Docker setup guide
   - Troubleshooting section
   - Common commands reference

8. **README.md**
   - Project overview
   - Quick start instructions
   - Documentation links

9. **start-docker.sh**
   - Automated setup script
   - Interactive admin user creation
   - Health checks and validation

### Modified Files

1. **docker-compose.yml**
   - Added backend service
   - Added frontend service
   - Configured networking and volumes
   - Added health checks

2. **Makefile**
   - Updated to use `docker compose` (V2 syntax)
   - Added Docker management commands
   - Added migration and seed commands for Docker

3. **client/src/services/api.js**
   - Updated to use environment variable for API URL
   - Defaults to `/api` for Docker setup
   - Can be overridden with VITE_API_URL

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   Frontend   │    │   Backend    │    │    DB      │ │
│  │   (Nginx)    │───▶│  (FastAPI)   │───▶│ (Postgres) │ │
│  │   Port 3000  │    │  Port 8000   │    │ Port 5432  │ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
│         │                   │                   │        │
│         └───────────────────┴───────────────────┘        │
│                    Shared Volumes                        │
│              (uploads, pgdata)                           │
└─────────────────────────────────────────────────────────┘
```

## Services

### 1. Database (db)
- **Image**: postgres:16
- **Port**: 5432
- **Volume**: pgdata (persistent)
- **Health Check**: pg_isready
- **Credentials**: user/pass (from docker-compose.yml)

### 2. Backend (backend)
- **Image**: Custom Python 3.14
- **Port**: 8000
- **Depends On**: db (healthy)
- **Volume**: ./uploads (bind mount)
- **Health Check**: /health endpoint
- **Environment**: From .env file

### 3. Frontend (frontend)
- **Image**: Custom Nginx Alpine
- **Port**: 3000 (maps to 80 internally)
- **Depends On**: backend
- **Health Check**: HTTP check on port 80
- **Routing**: React SPA with API proxy

## Networking

- All services communicate on default Docker network
- Frontend proxies `/api/*` requests to backend
- Backend connects to database using service name `db`
- CORS configured for localhost:3000, 5173, and root

## Volumes

1. **pgdata** (named volume)
   - PostgreSQL data persistence
   - Survives container restarts

2. **./uploads** (bind mount)
   - File uploads storage
   - Accessible from host and container

## Quick Start

### Option 1: Automated Script
```bash
./start-docker.sh
```

### Option 2: Manual Setup
```bash
# 1. Copy environment template
cp .env.docker .env

# 2. Edit .env and add OPENROUTER_API_KEY
nano .env

# 3. Build and start
docker compose up --build -d

# 4. Run migrations
docker compose exec backend alembic upgrade head

# 5. Create admin user
docker compose exec backend python scripts/seed_admin.py
```

## Common Commands

### Using Make
```bash
make docker-build          # Build images
make docker-up             # Start services
make docker-down           # Stop services
make docker-rebuild        # Rebuild and restart
make docker-logs           # View all logs
make docker-backend-logs   # View backend logs
make docker-migrate        # Run migrations
make docker-seed-admin     # Create admin user
make docker-reset          # Reset everything
```

### Using Docker Compose Directly
```bash
docker compose up -d                    # Start services
docker compose down                     # Stop services
docker compose logs -f                  # View logs
docker compose exec backend bash        # Backend shell
docker compose exec backend alembic upgrade head  # Migrations
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432

## Environment Variables

Key variables in `.env`:

```env
OPENROUTER_API_KEY=your-key-here
JWT_SECRET=change-me-in-production
DEFAULT_LLM_MODEL=google/gemma-4-26b-a4b-it
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://localhost"]
```

## Troubleshooting

### Port Already in Use
Change port mappings in `docker-compose.yml`:
```yaml
ports:
  - "8080:8000"  # Change 8080 to available port
```

### Backend Not Starting
```bash
# Check logs
docker compose logs backend

# Verify database is healthy
docker compose logs db
```

### Frontend Can't Connect
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings in backend
docker compose exec backend env | grep CORS
```

### Database Connection Issues
```bash
# Wait for database to be ready
docker compose logs db | grep "ready to accept connections"

# Test connection
docker compose exec backend python -c "from app.database import engine; print(engine)"
```

## Production Considerations

Before deploying to production:

1. **Change default passwords**
   - PostgreSQL credentials in docker-compose.yml
   - JWT_SECRET in .env

2. **Update CORS_ORIGINS**
   - Add your production domain
   - Remove localhost entries

3. **Use secrets management**
   - Don't commit .env file
   - Use Docker secrets or environment injection

4. **Enable HTTPS**
   - Add SSL certificate
   - Configure Nginx for HTTPS
   - Update CORS to use https://

5. **Resource limits**
   - Add memory/CPU limits to services
   - Configure proper logging

6. **Backups**
   - Set up PostgreSQL backups
   - Backup uploads directory

## Performance

- Backend: ~200MB RAM
- Frontend: ~50MB RAM
- Database: ~100MB RAM (varies with data)
- Total: ~350MB+ RAM minimum

## Next Steps

1. Test the Docker setup: `./start-docker.sh`
2. Verify all services are running: `docker compose ps`
3. Access frontend at http://localhost:3000
4. Create admin user and test functionality
5. Review logs if issues occur: `docker compose logs -f`

## Support

- Check DOCKER_SETUP.md for detailed guide
- Review README.md for project overview
- Check API docs at http://localhost:8000/docs
- View logs: `docker compose logs -f`
