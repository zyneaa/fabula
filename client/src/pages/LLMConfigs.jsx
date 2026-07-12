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
    max_materials: 5,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data } = await api.get('/llm-configs');
      setConfigs(data);
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
      const method = editingId ? 'put' : 'post';
      const url = editingId ? `/llm-configs/${editingId}` : '/llm-configs';
      await api[method](url, formData);
      fetchConfigs();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (config) => {
    setFormData(config);
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this config?')) return;
    try {
      await api.delete(`/llm-configs/${id}`);
      fetchConfigs();
    } catch (err) {
      setError('Failed to delete config');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', provider: 'openrouter', model_name: '',
      is_active: true, max_tokens: 4000, max_materials: 5,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">LLM Configurations</h1>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="btn btn-primary" style={{width: 'auto'}}>
          {showForm ? 'Cancel' : '+ New Config'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px', marginBottom: 'var(--gutter)' }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Model Name</label>
            <input type="text" value={formData.model_name} onChange={(e) => setFormData({ ...formData, model_name: e.target.value })} required className="form-input" placeholder="e.g., openai/gpt-4o"/>
          </div>
          <button type="submit" className="btn btn-primary">{editingId ? 'Update Config' : 'Create Config'}</button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Model</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id}>
                <td>{config.name}</td>
                <td>{config.model_name}</td>
                <td>{config.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button onClick={() => handleEdit(config)} className="btn btn-secondary" style={{width: 'auto', marginRight: '8px'}}>Edit</button>
                  <button onClick={() => handleDelete(config.id)} className="btn btn-secondary" style={{width: 'auto'}}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
