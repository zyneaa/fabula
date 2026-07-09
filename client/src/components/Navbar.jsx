import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={{ backgroundColor: '#333', padding: '10px 20px', color: 'white' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
          <Link to="/materials" style={{ color: 'white', textDecoration: 'none' }}>Materials</Link>
          {(user.role === 'teacher' || user.role === 'admin') && (
            <>
              <Link to="/llm-configs" style={{ color: 'white', textDecoration: 'none' }}>LLM Configs</Link>
              <Link to="/assign-configs" style={{ color: 'white', textDecoration: 'none' }}>Assign Configs</Link>
              <Link to="/users" style={{ color: 'white', textDecoration: 'none' }}>Users</Link>
              <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>Create User</Link>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>{user.name} ({user.role})</span>
          <button
            onClick={handleLogout}
            style={{ padding: '5px 15px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
