import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import WorkspaceLayout from './components/WorkspaceLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import LLMConfigs from './pages/LLMConfigs';
import StudentAssignments from './pages/StudentAssignments';
import Users from './pages/Users';
import Chat from './pages/Chat';
import ExamPaper from './pages/ExamPaper';
import UniInfo from './pages/UniInfo';
import Profile from './pages/Profile';
import MyLLMConfig from './pages/MyLLMConfig';
import SystemSettings from './pages/SystemSettings';
import Departments from './pages/Departments';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-on-surface-variant">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;

  return children;
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (roles && !roles.includes(user?.role)) return <Navigate to="/chat" />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-on-surface-variant">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/chat" /> : <Login />} />
      <Route
        path="/register"
        element={
          <ProtectedRoute>
            <RoleRoute roles={['teacher', 'admin']}>
              <Register />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/chat" replace />} />

      <Route
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/chat" element={<Chat />} />
        <Route path="/exam-paper" element={<RoleRoute roles={['teacher', 'admin']}><ExamPaper /></RoleRoute>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-llm-config" element={<MyLLMConfig />} />
        <Route path="/uni-info" element={<RoleRoute roles={['teacher', 'admin']}><UniInfo /></RoleRoute>} />
        <Route path="/llm-configs" element={<RoleRoute roles={['teacher', 'admin']}><LLMConfigs /></RoleRoute>} />
        <Route path="/student-assignments" element={<RoleRoute roles={['teacher', 'admin']}><StudentAssignments /></RoleRoute>} />
        <Route path="/users" element={<RoleRoute roles={['teacher', 'admin']}><Users /></RoleRoute>} />
        <Route path="/system-settings" element={<RoleRoute roles={['admin']}><SystemSettings /></RoleRoute>} />
        <Route path="/departments" element={<RoleRoute roles={['admin']}><Departments /></RoleRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
