import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/users', { email, password, name, role });
      if (user) {
        navigate('/users');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const formFields = (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="form-input"
          placeholder="Full name"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
          placeholder="you@university.edu"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="form-input"
          placeholder="••••••••"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="role">Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="form-input"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          {user?.role === 'admin' && <option value="admin">Admin</option>}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Creating...' : user ? 'Create User' : 'Create Account'}
      </button>
    </>
  );

  if (user) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Create New User</h1>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
          {formFields}
        </form>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join Fabula to get started</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>{formFields}</form>
        <p style={{ marginTop: 'var(--gutter)', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
