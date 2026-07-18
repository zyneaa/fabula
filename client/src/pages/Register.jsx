import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
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

  const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)] placeholder:text-on-surface-variant placeholder:opacity-60";
  const labelClass = "block font-mono text-sm font-medium mb-2 text-on-surface-variant";

  const formFields = (
    <>
      <div className="mb-6">
        <label className={labelClass} htmlFor="name">Name</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Full name" />
      </div>
      <div className="mb-6">
        <label className={labelClass} htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@university.edu" />
      </div>
      <div className="mb-6">
        <label className={labelClass} htmlFor="password">Password</label>
        <div className="relative">
          <input id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={`${inputClass} pr-10`} placeholder="••••••••" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-on-surface-variant cursor-pointer p-1 flex items-center hover:text-on-surface" tabIndex={-1}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div className="mb-6">
        <label className={labelClass} htmlFor="role">Role</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
          <option value="student">Student</option>
          {user?.role !== 'teacher' && <option value="teacher">Teacher</option>}
          {user?.role === 'admin' && <option value="admin">Admin</option>}
        </select>
      </div>
      <button type="submit" disabled={loading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed w-full">
        {loading ? 'Creating...' : user ? 'Create User' : 'Create Account'}
      </button>
    </>
  );

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-full py-10">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h1 className="font-display text-3xl font-semibold text-on-surface">Create New User</h1>
          </div>
          {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}
          <div className="bg-white rounded-lg border border-border-subtle p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="name">Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Full name" />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@university.edu" />
            </div>
            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={`${inputClass} pr-10`} placeholder="••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-on-surface-variant cursor-pointer p-1 flex items-center hover:text-on-surface" tabIndex={-1}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                <option value="student">Student</option>
                {user?.role !== 'teacher' && <option value="teacher">Teacher</option>}
                {user?.role === 'admin' && <option value="admin">Admin</option>}
              </select>
            </div>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed w-full">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-[400px] p-10 bg-surface-container-lowest rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.05)]">
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl font-semibold text-on-surface mb-2">Create Account</h2>
          <p className="text-on-surface-variant">Join Fabula to get started</p>
        </div>
        {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}
        <form onSubmit={handleSubmit}>{formFields}</form>
        <p className="mt-6 text-center text-on-surface-variant">
          Already have an account? <Link to="/login" className="text-primary">Login</Link>
        </p>
      </div>
    </div>
  );
}
