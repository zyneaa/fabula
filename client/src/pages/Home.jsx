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
    <div className="max-w-container mx-auto">
      <header className="mb-10">
        <h1 className="font-display text-5xl font-bold leading-[56px] tracking-tight text-on-surface">Welcome, {user.name}</h1>
        <p className="font-body text-lg text-on-surface-variant mt-2">Here are some quick links to get you started.</p>
      </header>

      <main>
        <h2 className="font-mono text-sm font-medium uppercase text-on-surface-variant mb-6">Tools &amp; Resources</h2>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="block p-6 bg-white rounded-lg no-underline text-on-surface border border-border-subtle transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.05)]">
              <h3 className="font-display text-xl font-semibold mb-2">{link.title}</h3>
              <p className="font-body text-sm text-text-muted">{link.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
