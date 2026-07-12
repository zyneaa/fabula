import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ALL_LINKS = [
  { to: '/chat', title: 'Chat Assistant', desc: 'Upload materials, ask questions, generate notes and quizzes' },
  { to: '/materials', title: 'Materials', desc: 'View and manage uploaded materials' },
  { to: '/uni-info', title: 'University Info', desc: 'Manage university information' },
];

const TEACHER_LINKS = [
  { to: '/llm-configs', title: 'LLM Configurations', desc: 'Manage AI model settings' },
  { to: '/assign-configs', title: 'Assign Configs', desc: 'Assign configs to students' },
  { to: '/users', title: 'Users', desc: 'View all users' },
  { to: '/register', title: 'Create User', desc: 'Create new user accounts' },
];

export default function Home() {
  const { user } = useAuth();

  const links = user && (user.role === 'teacher' || user.role === 'admin')
    ? [...ALL_LINKS, ...TEACHER_LINKS]
    : ALL_LINKS;

  return (
    <div className="container">
      <header className="home-header">
        <h1 className="home-title">Welcome, {user.name}</h1>
        <p className="home-subtitle">Here are some quick links to get you started.</p>
      </header>

      <main>
        <h2 className="home-section-title">Tools &amp; Resources</h2>
        <div className="quick-links-grid">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="quick-link-card">
              <h3 className="quick-link-card-title">{link.title}</h3>
              <p className="quick-link-card-desc">{link.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
