import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function UniInfo() {
  const { user } = useAuth();
  const [uniInfo, setUniInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category: 'course',
    title: '',
    content: '',
    metadata_json: null,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUniInfo();
  }, []);

  const fetchUniInfo = async () => {
    try {
      const res = await api.get('/uni-info/');
      setUniInfo(res.data);
    } catch (err) {
      setError('Failed to load university info');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/uni-info/${editingId}`, formData);
      } else {
        await api.post('/uni-info/', formData);
      }
      fetchUniInfo();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      category: item.category,
      title: item.title,
      content: item.content,
      metadata_json: item.metadata,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/uni-info/${id}`);
      fetchUniInfo();
    } catch (err) {
      setError('Failed to delete entry');
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'course',
      title: '',
      content: '',
      metadata_json: null,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>University Information</h2>
        {user?.role !== 'student' && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            {showForm ? 'Cancel' : 'Add Entry'}
          </button>
        )}
      </div>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {showForm && user?.role !== 'student' && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>
          <div style={{ marginBottom: '15px' }}>
            <label>Category:</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="timetable">Timetable</option>
              <option value="event">Event</option>
              <option value="directory">Directory</option>
              <option value="course">Course</option>
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Title:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Content:</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={6}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      {uniInfo.length === 0 ? (
        <p>No university information available yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {uniInfo.map((item) => (
            <div key={item.id} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <span style={{ padding: '3px 8px', borderRadius: '3px', backgroundColor: '#e9ecef', fontSize: '12px', textTransform: 'uppercase' }}>
                    {item.category}
                  </span>
                  <h3 style={{ margin: '10px 0 5px 0' }}>{item.title}</h3>
                </div>
                {user?.role !== 'student' && (
                  <div>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{ padding: '5px 10px', cursor: 'pointer', marginRight: '5px', backgroundColor: '#ffc107', border: 'none', borderRadius: '3px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{item.content}</p>
              <small style={{ color: '#999', marginTop: '10px', display: 'block' }}>
                Created: {new Date(item.created_at).toLocaleDateString()}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
