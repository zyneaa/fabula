import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import api from '../services/api';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [assignDept, setAssignDept] = useState('');
  const [assignTeacher, setAssignTeacher] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [deptRes, usersRes] = await Promise.all([
        api.get('/departments'),
        api.get('/users'),
      ]);
      setDepartments(deptRes.data);
      setTeachers(usersRes.data.filter(u => u.role === 'teacher'));
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createDept = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    setSuccess('');
    try {
      await api.post('/departments', { name: newName.trim() });
      setSuccess('Department created.');
      setNewName('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create');
    }
  };

  const updateDept = async (id) => {
    if (!editName.trim()) return;
    setError('');
    setSuccess('');
    try {
      await api.put(`/departments/${id}`, { name: editName.trim() });
      setSuccess('Department updated.');
      setEditingId(null);
      setEditName('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update');
    }
  };

  const deleteDept = async (id) => {
    if (!confirm('Delete this department?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/departments/${id}`);
      setSuccess('Department deleted.');
      fetchData();
    } catch {
      setError('Failed to delete');
    }
  };

  const assign = async (e) => {
    e.preventDefault();
    if (!assignTeacher || !assignDept) return;
    setError('');
    setSuccess('');
    try {
      await api.post('/departments/assign', {
        user_id: parseInt(assignTeacher),
        department_id: parseInt(assignDept),
      });
      setSuccess('Teacher assigned to department.');
      setAssignTeacher('');
      setAssignDept('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign');
    }
  };

  const inputClass = "block w-full px-3 py-2 font-mono text-xs border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)] appearance-none cursor-pointer";
  const labelClass = "block font-mono text-xs font-medium mb-1.5 text-on-surface-variant";
  const btnPrimary = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 w-auto";
  const btnDanger = "inline-flex items-center justify-center rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high px-3 py-1.5 w-auto";

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-on-surface">Departments</h1>
      </div>

      {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}
      {success && <div className="p-3 rounded-lg mb-6 text-sm bg-[#d1fae5] text-[#065f46]">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-border-subtle p-6">
          <h2 className="font-mono text-sm font-semibold mb-4">Manage Departments</h2>

          <form onSubmit={createDept} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Department name"
              className={inputClass}
              required
            />
            <button type="submit" className={btnPrimary}><Plus size={16} /></button>
          </form>

          <div className="space-y-2">
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                {editingId === dept.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                    <button onClick={() => updateDept(dept.id)} className={btnPrimary}>Save</button>
                    <button onClick={() => { setEditingId(null); setEditName(''); }} className={btnDanger}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="font-body text-sm">{dept.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingId(dept.id); setEditName(dept.name); }}
                        className={btnDanger}
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteDept(dept.id)}
                        className={btnDanger}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {departments.length === 0 && <p className="text-text-muted text-sm">No departments yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border-subtle p-6">
          <h2 className="font-mono text-sm font-semibold mb-4">Assign Teacher to Department</h2>

          <form onSubmit={assign} className="space-y-4">
            <div>
              <label className={labelClass}>Teacher</label>
              <select
                value={assignTeacher}
                onChange={e => setAssignTeacher(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select teacher...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select
                value={assignDept}
                onChange={e => setAssignDept(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className={btnPrimary}>Assign</button>
          </form>
        </div>
      </div>
    </div>
  );
}
