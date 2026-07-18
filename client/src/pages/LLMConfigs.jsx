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
      let restrictions = formData.restrictions;
      if (typeof restrictions === 'string') {
        try { restrictions = restrictions.trim() ? JSON.parse(restrictions) : null; } catch { restrictions = null; }
      }
      const payload = {
        ...formData,
        max_tokens: formData.max_tokens || null,
        restrictions,
      };
      await api[method](url, payload);
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
      is_active: true, max_tokens: 4000, max_materials: 5, restrictions: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]";
  const labelClass = "block font-mono text-sm font-medium mb-2 text-on-surface-variant";
  const btnPrimary = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 w-auto";
  const btnSecondary = "inline-flex items-center justify-center rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high px-3 py-1.5 w-auto";

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="font-display text-3xl font-semibold text-on-surface">LLM Configurations</h1>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className={btnPrimary}>
          {showForm ? 'Cancel' : '+ New Config'}
        </button>
      </div>

      {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px', marginBottom: '24px' }}>
          <div className="mb-5">
            <label className={labelClass}>Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={inputClass} />
          </div>
          <div className="mb-5">
            <label className={labelClass}>Provider</label>
            <input type="text" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} required className={inputClass} placeholder="e.g., openrouter" />
          </div>
          <div className="mb-5">
            <label className={labelClass}>Model Name</label>
            <input type="text" value={formData.model_name} onChange={(e) => setFormData({ ...formData, model_name: e.target.value })} required className={inputClass} placeholder="e.g., openai/gpt-4o" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Max Tokens</label>
              <input type="number" value={formData.max_tokens} onChange={(e) => setFormData({ ...formData, max_tokens: Number(e.target.value) })} className={inputClass} min={1} />
            </div>
            <div>
              <label className={labelClass}>Max Materials</label>
              <input type="number" value={formData.max_materials} onChange={(e) => setFormData({ ...formData, max_materials: Number(e.target.value) })} className={inputClass} min={1} max={50} />
            </div>
          </div>
          <div className="mb-5">
            <label className={labelClass}>Restrictions (JSON)</label>
            <textarea value={typeof formData.restrictions === 'object' ? JSON.stringify(formData.restrictions, null, 2) : (formData.restrictions || '')} onChange={(e) => { try { setFormData({ ...formData, restrictions: JSON.parse(e.target.value) }); } catch { setFormData({ ...formData, restrictions: e.target.value }); } }} className={`${inputClass} font-mono text-sm min-h-[100px]`} placeholder='{"allow_topics": ["math", "science"]}' />
          </div>
          <div className="mb-5 flex items-center gap-3">
            <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 accent-primary" />
            <label htmlFor="is_active" className={labelClass} style={{ marginBottom: 0 }}>Active</label>
          </div>
          <button type="submit" className={btnPrimary}>{editingId ? 'Update Config' : 'Create Config'}</button>
        </form>
      )}

      <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Name</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Model</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Max Tokens</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Max Materials</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Restrictions</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Status</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config.id}>
                <td className="px-4 py-4 border-b border-border-subtle">{config.name}</td>
                <td className="px-4 py-4 border-b border-border-subtle">{config.model_name}</td>
                <td className="px-4 py-4 border-b border-border-subtle font-mono text-sm">{config.max_tokens ?? '—'}</td>
                <td className="px-4 py-4 border-b border-border-subtle font-mono text-sm">{config.max_materials}</td>
                <td className="px-4 py-4 border-b border-border-subtle font-mono text-xs max-w-[200px] truncate" title={typeof config.restrictions === 'object' ? JSON.stringify(config.restrictions) : (config.restrictions || '')}>{config.restrictions ? (typeof config.restrictions === 'object' ? JSON.stringify(config.restrictions) : config.restrictions) : '—'}</td>
                <td className="px-4 py-4 border-b border-border-subtle">{config.is_active ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-4 border-b border-border-subtle">
                  <button onClick={() => handleEdit(config)} className={btnSecondary} style={{marginRight: '8px'}}>Edit</button>
                  <button onClick={() => handleDelete(config.id)} className={btnSecondary}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
