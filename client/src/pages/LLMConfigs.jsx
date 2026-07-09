import { useState, useEffect } from 'react';
import api from '../services/api';

export default function LLMConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openrouter',
    model_name: '',
    is_active: true,
    max_tokens: 4000,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/llm-configs');
      setConfigs(res.data);
    } catch (err) {
      setError('Failed to load configs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/llm-configs/${editingId}`, formData);
      } else {
        await api.post('/llm-configs', formData);
      }
      fetchConfigs();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (config) => {
    setFormData({
      name: config.name,
      provider: config.provider,
      model_name: config.model_name,
      is_active: config.is_active,
      max_tokens: config.max_tokens,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this config?')) return;
    try {
      await api.delete(`/llm-configs/${id}`);
      fetchConfigs();
    } catch (err) {
      setError('Failed to delete config');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openrouter',
      model_name: '',
      is_active: true,
      max_tokens: 4000,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>LLM Configurations</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          {showForm ? 'Cancel' : 'Create Config'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h3>{editingId ? 'Edit Config' : 'Create Config'}</h3>
          <div style={{ marginBottom: '15px' }}>
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Provider:</label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Model Name:</label>
            <input
              type="text"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              required
              placeholder="e.g., openai/gpt-4o"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Max Tokens:</label>
            <input
              type="number"
              value={formData.max_tokens || ''}
              onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || null })}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              {' '}Active
            </label>
          </div>
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      {configs.length === 0 ? (
        <p>No configurations created yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Model</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Max Tokens</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{config.name}</td>
                <td style={{ padding: '10px' }}>{config.model_name}</td>
                <td style={{ padding: '10px' }}>{config.max_tokens || 'Unlimited'}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '3px',
                    backgroundColor: config.is_active ? '#d4edda' : '#f8d7da',
                  }}>
                    {config.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => handleEdit(config)}
                    style={{ padding: '5px 10px', cursor: 'pointer', marginRight: '5px', backgroundColor: '#ffc107', border: 'none', borderRadius: '3px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
