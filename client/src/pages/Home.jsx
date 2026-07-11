import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h1>Welcome to Fabula</h1>
      {user ? (
        <div>
          <p>Hello, {user.name}! You are logged in as <strong>{user.role}</strong>.</p>
          <h3>Quick Links:</h3>
          <ul>
            <li><Link to="/materials">Study Materials</Link> - Upload and manage your study materials</li>
            <li><Link to="/uni-info">University Info</Link> - Browse university information</li>
            <li><Link to="/chat">Chat Assistant</Link> - Ask questions about university info</li>
            {(user.role === 'teacher' || user.role === 'admin') && (
              <>
                <li><Link to="/llm-configs">LLM Configurations</Link> - Manage AI model settings</li>
                <li><Link to="/assign-configs">Assign Configs</Link> - Assign configs to students</li>
                <li><Link to="/users">Users</Link> - View all users</li>
                <li><Link to="/register">Create User</Link> - Create new user accounts</li>
              </>
            )}
          </ul>
        </div>
      ) : (
        <div>
          <p>Please login to continue.</p>
          <Link to="/login" style={{ marginRight: '10px' }}>Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </div>
  );
}
