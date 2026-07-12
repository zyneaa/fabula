import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import WorkspaceLayout from './components/WorkspaceLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import LLMConfigs from './pages/LLMConfigs';
import AssignConfigs from './pages/AssignConfigs';
import Users from './pages/Users';
import Chat from './pages/Chat';
import UniInfo from './pages/UniInfo';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state">
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
      <div className="loading-state">
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
        <Route path="/uni-info" element={<RoleRoute roles={['teacher', 'admin']}><UniInfo /></RoleRoute>} />
        <Route path="/llm-configs" element={<RoleRoute roles={['teacher', 'admin']}><LLMConfigs /></RoleRoute>} />
        <Route path="/assign-configs" element={<RoleRoute roles={['teacher', 'admin']}><AssignConfigs /></RoleRoute>} />
        <Route path="/users" element={<RoleRoute roles={['teacher', 'admin']}><Users /></RoleRoute>} />
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
