import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const roleBadgeClass = (role) => {
  switch (role) {
    case 'admin': return 'bg-primary-container text-on-primary-container';
    case 'teacher': return 'bg-secondary-container text-on-secondary-container';
    default: return 'bg-surface-container-highest text-on-surface';
  }
};

const filterClass = "w-full px-3 py-2 font-mono text-xs border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)] appearance-none cursor-pointer";

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, deptRes] = await Promise.all([
          api.get('/users'),
          api.get('/departments').catch(() => ({ data: [] })),
        ]);
        setUsers(usersRes.data);
        setDepartments(deptRes.data || []);
      } catch {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (filterYear && (u.year === null || u.year === undefined || u.year.toString() !== filterYear)) return false;
    if (filterDept && (u.department_id === null || u.department_id === undefined || u.department_id.toString() !== filterDept)) return false;
    return true;
  });

  if (loading) return <p>Loading users...</p>;

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const yearOpts = [1, 2, 3, 4, 5, 6];

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="font-display text-3xl font-semibold text-on-surface">Users</h1>
        <Link to="/register" className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90">+ Create User</Link>
      </div>

      {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}

      <div className="bg-surface-container-lowest rounded-lg border border-border-subtle p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className={`${filterClass} pl-8`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-none border-none text-on-surface-variant cursor-pointer p-0.5 hover:text-on-surface flex items-center">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="min-w-[130px]">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={filterClass}>
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={filterClass}>
              <option value="">All Years</option>
              {yearOpts.map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="min-w-[150px]">
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={filterClass}>
              <option value="">All Depts</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Name</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Email</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Role</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Year</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Major</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Department</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Created At</th>
              {currentUser?.role === 'admin' && <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const dept = departments.find((d) => d.id === user.department_id);
              return (
                <tr key={user.id}>
                  <td className="px-4 py-4 border-b border-border-subtle">{user.name}</td>
                  <td className="px-4 py-4 border-b border-border-subtle">{user.email}</td>
                  <td className="px-4 py-4 border-b border-border-subtle">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${roleBadgeClass(user.role)}`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-4 border-b border-border-subtle font-mono text-sm">{user.year ? `Year ${user.year}` : '—'}</td>
                  <td className="px-4 py-4 border-b border-border-subtle font-mono text-sm">{user.major || '—'}</td>
                  <td className="px-4 py-4 border-b border-border-subtle font-mono text-sm">{dept?.name || user.department || '—'}</td>
                  <td className="px-4 py-4 border-b border-border-subtle font-mono text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                  {currentUser?.role === 'admin' && (
                    <td className="px-4 py-4 border-b border-border-subtle">
                      {user.role !== 'admin' && (
                        <button onClick={() => handleDelete(user.id, user.name)} className="inline-flex items-center gap-1 rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-error-container text-on-error-container border-outline hover:opacity-80 px-3 py-1.5" title="Delete user">
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={currentUser?.role === 'admin' ? 8 : 7} className="px-4 py-8 text-center text-on-surface-variant text-sm">No users match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-right text-sm text-on-surface-variant font-mono">
        {filtered.length} / {users.length} users
      </div>
    </div>
  );
}
