# Docker Setup Guide

This guide explains how to run the Fabula application using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- OpenRouter API key (for LLM features)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd fabula
```

### 2. Set up environment variables

Copy the Docker environment template:

```bash
cp .env.docker .env
```

Edit `.env` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your-actual-api-key-here
```

### 3. Build and start the containers

```bash
docker-compose up --build
```

This will:
- Build the backend (FastAPI) image
- Build the frontend (React) image
- Start PostgreSQL database
- Start all services

### 4. Access the application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432

### 5. Create an admin user

In a new terminal, run:

```bash
docker-compose exec backend python scripts/seed_admin.py
```

Or with custom credentials:

```bash
docker-compose exec backend env ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=Admin123 ADMIN_NAME="Admin" python scripts/seed_admin.py
```

## Architecture

The Docker setup includes three services:

### 1. Database (PostgreSQL 16)
- Port: 5432
- Persistent storage via Docker volume
- Automatic health checks

### 2. Backend (FastAPI)
- Port: 8000
- Python 3.14
- Automatic database migrations on startup
- CORS configured for frontend access

### 3. Frontend (React + Vite)
- Port: 3000
- Nginx for serving static files
- API requests proxied to backend

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### View specific service logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### Run database migrations
```bash
docker-compose exec backend alembic upgrade head
```

### Access backend shell
```bash
docker-compose exec backend bash
```

### Run tests
```bash
docker-compose exec backend pytest
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d db
docker-compose exec backend alembic upgrade head
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | API key for LLM services | (required) |
| `JWT_SECRET` | Secret key for JWT tokens | change-me-in-production |
| `JWT_ALGORITHM` | JWT algorithm | HS256 |
| `JWT_EXPIRE_MINUTES` | Token expiration time | 60 |
| `DEFAULT_LLM_MODEL` | Default LLM model | google/gemma-4-26b-a4b-it |
| `UPLOAD_DIR` | Upload directory | ./uploads |
| `MAX_UPLOAD_SIZE_MB` | Max upload size | 50 |
| `CORS_ORIGINS` | Allowed CORS origins | ["http://localhost:3000",...] |

## Troubleshooting

### Port already in use

If port 3000, 8000, or 5432 is already in use:

1. Edit `docker-compose.yml`
2. Change the port mapping:
   ```yaml
   ports:
     - "8080:8000"  # Change 8080 to your preferred port
   ```

### Database connection errors

Wait for the database to be ready:

```bash
docker-compose logs db
```

Look for: `database system is ready to accept connections`

### Backend not starting

Check backend logs:

```bash
docker-compose logs backend
```

Common issues:
- Missing environment variables
- Database not ready (wait for health check)
- Port conflicts

### Frontend can't connect to backend

1. Check backend is running: `docker-compose ps`
2. Check CORS settings in backend config
3. Verify nginx proxy configuration in `client/nginx.conf`

## Development Mode

For development with hot reload, you can mount volumes:

```yaml
# In docker-compose.yml, add to backend service:
volumes:
  - ./app:/app/app
  - ./uploads:/app/uploads

# Add to frontend service:
volumes:
  - ./client/src:/app/src
```

Then rebuild:

```bash
docker-compose up --build
```

## Production Deployment

For production deployment:

1. **Change default passwords** in `docker-compose.yml`
2. **Use strong JWT_SECRET** in `.env`
3. **Update CORS_ORIGINS** to your domain
4. **Consider using** a reverse proxy (nginx, traefik)
5. **Enable HTTPS** with SSL certificates
6. **Set up backups** for PostgreSQL data

## Data Persistence

- **Database**: Stored in `pgdata` Docker volume
- **Uploads**: Stored in `./uploads` directory (mounted)

To backup database:

```bash
docker-compose exec db pg_dump -U user fabula > backup.sql
```

To restore database:

```bash
cat backup.sql | docker-compose exec -T db psql -U user fabula
```

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up --build -d

# Run any new migrations
docker-compose exec backend alembic upgrade head
```

## Stopping Everything

```bash
# Stop containers (keep data)
docker-compose down

# Stop and remove volumes (deletes all data)
docker-compose down -v
```

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Check the troubleshooting section above
