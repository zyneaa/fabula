import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Materials from './pages/Materials';
import LLMConfigs from './pages/LLMConfigs';
import AssignConfigs from './pages/AssignConfigs';
import Users from './pages/Users';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <Register />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/materials" element={
          <ProtectedRoute>
            <Materials />
          </ProtectedRoute>
        } />
        <Route path="/llm-configs" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <LLMConfigs />
          </ProtectedRoute>
        } />
        <Route path="/assign-configs" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <AssignConfigs />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <Users />
          </ProtectedRoute>
        } />
      </Routes>
    </>
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
