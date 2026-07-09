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
      setConfigs(configsRes.data);
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
      setSuccess('Config assigned successfully');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Assignment failed');
    }
  };

  const handleRemove = async (assignmentId) => {
    if (!confirm('Remove this assignment?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/llm-configs/assign/${assignmentId}`);
      setSuccess('Assignment removed');
      fetchData();
    } catch (err) {
      setError('Failed to remove assignment');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '50px auto', padding: '20px' }}>
      <h2>Assign LLM Configs to Students</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}

      {students.length === 0 ? (
        <p>No students found.</p>
      ) : configs.length === 0 ? (
        <p>No configs available. Create configs first.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Student</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Assigned Configs</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{student.name}</td>
                <td style={{ padding: '10px' }}>{student.email}</td>
                <td style={{ padding: '10px' }}>
                  {assignments[student.id]?.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {assignments[student.id].map((assignment) => (
                        <li key={assignment.id}>
                          {assignment.config.name}
                          <button
                            onClick={() => handleRemove(assignment.id)}
                            style={{ marginLeft: '10px', padding: '2px 8px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ color: '#666' }}>No configs assigned</span>
                  )}
                </td>
                <td style={{ padding: '10px' }}>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssign(student.id, parseInt(e.target.value));
                        e.target.value = '';
                      }
                    }}
                    style={{ padding: '5px', cursor: 'pointer' }}
                  >
                    <option value="">Assign config...</option>
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
      )}
    </div>
  );
}
