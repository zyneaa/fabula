# Fabula Client

React frontend for testing the Fabula backend API.

## Setup

```bash
cd client
npm install
npm run dev
```

The app will be available at http://localhost:5173

## Features

### Authentication
- Login with existing credentials
- Register new users (teachers/admins only)
- Role-based access control

### Study Materials
- Upload PDF, DOCX, PPTX, TXT files
- View uploaded materials with status
- Delete materials

### LLM Configurations (Teachers/Admins)
- Create multiple LLM configs with different models
- Set token limits and restrictions
- Enable/disable configs

### Config Assignment (Teachers/Admins)
- Assign LLM configs to individual students
- View student assignments
- Remove assignments

### User Management (Teachers/Admins)
- View all users
- Create new users (role-based: teachers can create students, admins can create all roles)

## Testing Workflow

1. **Start the backend**: `make run`
2. **Start the frontend**: `cd client && npm run dev`
3. **Create an admin**: `make seed-admin ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=Admin123 ADMIN_NAME="Admin"`
4. **Login as admin** in the React app
5. **Create teachers and students** using the "Create User" page
6. **Login as teacher** and create LLM configs
7. **Assign configs to students**
8. **Upload materials** as any user

## API Configuration

The client connects to `http://localhost:8000` by default. Update `src/services/api.js` if your backend runs on a different port.

## Tech Stack

- React 18
- React Router 6
- Axios for API calls
- Vite for build tooling
