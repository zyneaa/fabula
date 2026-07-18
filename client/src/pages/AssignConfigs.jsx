import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AssignConfigs() {
  const [configs, setConfigs] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configsRes, studentsRes] = await Promise.all([
        api.get('/llm-configs'),
        api.get('/users/students'),
      ]);
      setConfigs(configsRes.data.filter(c => c.is_active));
      setStudents(studentsRes.data);

      const assignmentPromises = studentsRes.data.map(student =>
        api.get(`/llm-configs/student/${student.id}`).then(res => ({
          studentId: student.id,
          assignments: res.data,
        }))
      );
      const assignmentResults = await Promise.all(assignmentPromises);
      const assignmentMap = {};
      assignmentResults.forEach(({ studentId, assignments }) => {
        assignmentMap[studentId] = assignments;
      });
      setAssignments(assignmentMap);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (studentId, configId) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/llm-configs/assign', { student_id: studentId, config_id: configId });
      setSuccess('Config assigned successfully.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Assignment failed');
    }
  };

  const handleRemove = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/llm-configs/assign/${assignmentId}`);
      setSuccess('Assignment removed successfully.');
      fetchData();
    } catch (err) {
      setError('Failed to remove assignment');
    }
  };

  const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]";

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-on-surface">Assign LLM Configs</h1>
      </div>

      {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}
      {success && <div className="p-3 rounded-lg mb-6 text-sm bg-[#d1fae5] text-[#065f46]">{success}</div>}

      <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Student</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Assigned Configs</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-4 border-b border-border-subtle">
                  <div>{student.name}</div>
                  <div className="text-text-muted text-sm">{student.email}</div>
                </td>
                <td className="px-4 py-4 border-b border-border-subtle">
                  {assignments[student.id]?.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-2 mb-2">
                      <span>{assignment.config.name}</span>
                      <button onClick={() => handleRemove(assignment.id)} className="inline-flex items-center justify-center rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high px-3 py-1.5 w-auto">Remove</button>
                    </div>
                  ))}
                  {(!assignments[student.id] || assignments[student.id].length === 0) && <span className="text-text-muted">None</span>}
                </td>
                <td className="px-4 py-4 border-b border-border-subtle">
                  <select
                    className={inputClass}
                    style={{width: 'auto'}}
                    onChange={(e) => {
                      if (e.target.value) handleAssign(student.id, parseInt(e.target.value));
                      e.target.value = '';
                    }}
                  >
                    <option value="">Assign Config...</option>
                    {configs.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
