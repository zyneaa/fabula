# Docker Setup Complete ✅

Your Fabula application is now fully containerized and running!

## What's Running

All three services are up and healthy:

- **Database** (PostgreSQL 16) - Port 5432
- **Backend** (FastAPI) - Port 8000  
- **Frontend** (React + Nginx) - Port 3000

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **API Proxy**: http://localhost:3000/api/* (proxied to backend)

## Quick Test

```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000

# Test API proxy
curl http://localhost:3000/api/health
```

## Admin User

An admin user already exists:
- Email: admin@gmail.com
- Password: (the one you set earlier)

To create a different admin:
```bash
docker compose exec backend python scripts/seed_admin.py
```

## Common Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Stop/Start
```bash
# Stop all (keeps data)
docker compose down

# Start again
docker compose up -d

# Stop and remove everything (WARNING: deletes data)
docker compose down -v
```

### Rebuild After Code Changes
```bash
# Rebuild all
docker compose up --build -d

# Rebuild specific service
docker compose up --build -d backend
```

### Run Migrations
```bash
docker compose exec backend alembic upgrade head
```

### Access Container Shell
```bash
# Backend
docker compose exec backend bash

# Database
docker compose exec db psql -U user -d fabula
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Docker Network                │
│                                         │
│  ┌──────────┐   ┌──────────┐          │
│  │ Frontend │──▶│ Backend  │──┐       │
│  │  :3000   │   │  :8000   │  │       │
│  │ (Nginx)  │   │(FastAPI) │  │       │
│  └──────────┘   └──────────┘  │       │
│                                ▼       │
│                           ┌──────────┐ │
│                           │Database  │ │
│                           │  :5432   │ │
│                           │(Postgres)│ │
│                           └──────────┘ │
└─────────────────────────────────────────┘
```

## Data Persistence

- **Database**: Stored in Docker volume `fabula_pgdata`
- **Uploads**: Stored in `./uploads` directory (bind mount)

## Environment Variables

Configured in `docker-compose.yml`:
- Database connection
- JWT settings
- OpenRouter API key
- CORS origins
- PYTHONPATH (for script execution)

## Troubleshooting

### Backend not starting?
```bash
docker compose logs backend
```

### Can't connect to database?
```bash
# Check if DB is healthy
docker compose ps

# Check DB logs
docker compose logs db
```

### Frontend not loading?
```bash
# Check if backend is accessible
curl http://localhost:8000/health

# Check frontend logs
docker compose logs frontend
```

### Need to reset everything?
```bash
docker compose down -v
docker compose up --build -d
docker compose exec backend alembic upgrade head
```

## Development Workflow

1. **Make code changes**
2. **Rebuild affected service**:
   ```bash
   docker compose up --build -d backend  # or frontend
   ```
3. **Run migrations if needed**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
4. **Test your changes**

## Next Steps

1. Open http://localhost:3000 in your browser
2. Login with your admin credentials
3. Explore the application!

---

**Need help?** Check `DOCKER_SETUP.md` for detailed documentation.
