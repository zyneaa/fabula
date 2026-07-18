import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bot, User,
  SlidersHorizontal, UserPlus, Users, GraduationCap, Settings, Building2,
  LogOut, Cog,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/chat', icon: Bot, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const STUDENT_ITEMS = [
  { to: '/my-llm-config', icon: Cog, label: 'Assigned Config' },
];

const TEACHER_ITEMS = [
  { to: '/llm-configs', icon: SlidersHorizontal, label: 'LLM Configs' },
  { to: '/student-assignments', icon: UserPlus, label: 'Student Assignments' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/uni-info', icon: GraduationCap, label: 'Uni Info' },
];

const ADMIN_ITEMS = [
  { to: '/departments', icon: Building2, label: 'Departments' },
  { to: '/system-settings', icon: Settings, label: 'System Settings' },
];

export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  const linkClass = ({ isActive }) =>
    `flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-on-surface-variant no-underline transition-colors hover:bg-surface-container-lowest${
      isActive ? ' text-primary bg-primary-fixed' : ''
    }`;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="bg-surface flex flex-col items-center h-screen overflow-hidden py-3 w-16 flex-shrink-0 border-r border-outline-variant">
        <nav className="flex-1 flex flex-col gap-1 overflow-x-hidden overflow-y-auto items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} title={item.label}>
                <Icon size={20} />
              </NavLink>
            );
          })}

          {user?.role === 'student' && (
            <>
              <div className="w-8 border-t border-outline-variant my-1" />
              {STUDENT_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={linkClass} title={item.label}>
                    <Icon size={20} />
                  </NavLink>
                );
              })}
            </>
          )}

          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <>
              <div className="w-8 border-t border-outline-variant my-1" />
              {TEACHER_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={linkClass} title={item.label}>
                    <Icon size={20} />
                  </NavLink>
                );
              })}
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <div className="w-8 border-t border-outline-variant my-1" />
              {ADMIN_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={linkClass} title={item.label}>
                    <Icon size={20} />
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        <div className="flex flex-col items-center gap-2 pt-3 border-t border-outline-variant w-full">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-body text-xs font-semibold text-primary overflow-hidden flex-shrink-0 cursor-default" title={user?.name}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <button onClick={logout} className="bg-none border-none text-on-surface-variant cursor-pointer p-1.5 rounded-lg transition-colors hover:text-error flex items-center" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className={`flex-1 overflow-y-auto${isChat ? ' p-0 overflow-hidden flex' : ' p-10'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
