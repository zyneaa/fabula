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

  if (loading) return <p>Loading...</p>;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Assign LLM Configs</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Assigned Configs</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <div>{student.name}</div>
                  <div className="text-muted">{student.email}</div>
                </td>
                <td>
                  {assignments[student.id]?.map((assignment) => (
                    <div key={assignment.id} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                      <span>{assignment.config.name}</span>
                      <button onClick={() => handleRemove(assignment.id)} className="btn btn-secondary" style={{width: 'auto', padding: '4px 8px'}}>Remove</button>
                    </div>
                  ))}
                  {(!assignments[student.id] || assignments[student.id].length === 0) && <span className="text-muted">None</span>}
                </td>
                <td>
                  <select
                    className="form-input"
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
