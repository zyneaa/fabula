# Hot Reloading Setup

## Overview

Hot reloading is now enabled for both backend and frontend in Docker. Changes to your code will automatically reload without needing to rebuild containers.

## Access Points

- **Frontend (Dev Server)**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

Note: Frontend dev server runs on port **3001** instead of 3000 to avoid conflicts.

## How It Works

### Backend (FastAPI)

- Uses `uvicorn --reload` flag
- Watches for changes in `/app/app` directory
- Automatically restarts when Python files change
- Volume mount: `./app:/app/app`

### Frontend (React + Vite)

- Uses Vite dev server with Hot Module Replacement (HMR)
- Watches for changes in `/app/src` and `/app/public` directories
- Instant browser updates without full page reload
- Volume mounts:
  - `./client/src:/app/src`
  - `./client/public:/app/public`

## Configuration Files

### docker-compose.override.yml

This file overrides the base `docker-compose.yml` for development:

```yaml
services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./app:/app/app
      - ./uploads:/app/uploads

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.dev
    ports:
      - "3001:5173"
    volumes:
      - ./client/src:/app/src
      - ./client/public:/app/public
    environment:
      - VITE_API_URL=http://localhost:8000
```

### client/Dockerfile.dev

Development-specific Dockerfile for frontend:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

## Usage

### Starting with Hot Reloading

```bash
docker compose up -d
```

Docker Compose automatically merges `docker-compose.override.yml` with `docker-compose.yml`.

### Testing Hot Reload

**Backend:**
1. Edit a file in `app/` directory (e.g., `app/main.py`)
2. Save the file
3. Watch backend logs: `docker compose logs -f backend`
4. You'll see: `WARNING:  WatchFiles detected changes in 'app/main.py'. Reloading...`

**Frontend:**
1. Edit a file in `client/src/` directory (e.g., `client/src/App.jsx`)
2. Save the file
3. Browser automatically updates with changes
4. No manual refresh needed!

### Viewing Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

## Production vs Development

### Development (with hot reload)

```bash
docker compose up -d
```

Uses `docker-compose.override.yml` automatically.

### Production (without hot reload)

```bash
docker compose -f docker-compose.yml up -d
```

Uses only the base configuration, no volume mounts, optimized builds.

## Troubleshooting

### Changes Not Detecting

**Backend:**
- Check volume mount: `docker compose exec backend ls -la /app/app`
- Verify reloader is running: `docker compose logs backend | grep reloader`

**Frontend:**
- Check volume mount: `docker compose exec frontend ls -la /app/src`
- Verify Vite is running: `docker compose logs frontend | grep VITE`

### Port Conflicts

If port 3001 is in use, change it in `docker-compose.override.yml`:

```yaml
ports:
  - "8080:5173"  # Change 8080 to your preferred port
```

Then update `VITE_API_URL` if needed and restart:

```bash
docker compose down && docker compose up -d
```

### Container Not Rebuilding

If you add new dependencies:

```bash
# Backend
docker compose build backend
docker compose up -d backend

# Frontend
docker compose build frontend
docker compose up -d frontend
```

## Performance Notes

- Hot reloading adds minimal overhead (~50-100MB RAM)
- Vite HMR is extremely fast (<100ms for most changes)
- Uvicorn reload takes 1-2 seconds for backend changes
- Only restart containers when adding new dependencies

## File Watching Limits

If you have many files and changes aren't detected:

**Linux:**
```bash
# Increase inotify watches
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**macOS/Windows:**
Docker Desktop handles this automatically.

## Next Steps

1. Start developing! Edit files and see changes instantly
2. Use `docker compose logs -f` to monitor both services
3. Remember to test in production mode before deploying
4. Commit your `docker-compose.override.yml` for team consistency

---

**Happy coding! 🚀**
