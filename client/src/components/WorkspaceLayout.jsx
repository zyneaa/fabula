import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Bot, User,
  SlidersHorizontal, UserPlus, Users, GraduationCap,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/chat', icon: Bot, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const ADMIN_ITEMS = [
  { to: '/llm-configs', icon: SlidersHorizontal, label: 'LLM Configs' },
  { to: '/assign-configs', icon: UserPlus, label: 'Assign Configs' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/uni-info', icon: GraduationCap, label: 'Uni Info' },
];

function roleLabel(role) {
  if (role === 'admin') return 'Administrator';
  if (role === 'teacher') return 'Teacher';
  return 'Student';
}

export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <h1 className="workspace-brand-title">Fabula</h1>
          <p className="workspace-brand-subtitle">Knowledge Workspace</p>
        </div>

        <NavLink to="/chat" className="workspace-new-note">
          <Plus size={20} />
          New Note
        </NavLink>

        <nav className="workspace-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `workspace-nav-link${isActive ? ' workspace-nav-link--active' : ''}`
                }
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}

          {user && (user.role === 'admin' || user.role === 'teacher') && (
            <>
              <div className="workspace-nav-divider" />
              {ADMIN_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `workspace-nav-link${isActive ? ' workspace-nav-link--active' : ''}`
                    }
                  >
                    <Icon size={20} />
                    {item.label}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        <div className="workspace-user">
          <div className="workspace-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="workspace-user-info">
            <p className="workspace-user-name">{user?.name}</p>
            <p className="workspace-user-role">{roleLabel(user?.role)}</p>
          </div>
          <button onClick={logout} className="workspace-logout" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <div className="workspace-body">
        <main className={`workspace-main${isChat ? ' workspace-main--chat' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
