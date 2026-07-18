import { useState, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import api from '../services/api';

const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]";
const labelClass = "block font-mono text-sm font-medium mb-2 text-on-surface-variant";

export default function MyLLMConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/llm-configs/me');
      setConfig(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setConfig(null);
      } else {
        setError(err.response?.data?.detail || 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-on-surface-variant">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-on-surface">My LLM Config</h1>
      </div>

      {error && <div className="p-3 rounded-lg mb-4 text-sm bg-error-container text-on-error-container">{error}</div>}

      {!config ? (
        <div className="bg-white rounded-lg border border-border-subtle p-10 text-center">
          <SlidersHorizontal size={40} className="mx-auto mb-4 text-on-surface-variant opacity-40" />
          <p className="font-body text-base text-on-surface-variant">No LLM config assigned yet.</p>
          <p className="font-body text-sm text-on-surface-variant mt-1">Contact your teacher to get a configuration assigned.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-subtle p-6 space-y-5">
          <div>
            <label className={labelClass}>Name</label>
            <input type="text" value={config.config.name} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>

          <div>
            <label className={labelClass}>Provider</label>
            <input type="text" value={config.config.provider} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>

          <div>
            <label className={labelClass}>Model</label>
            <input type="text" value={config.config.model_name} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Max Tokens</label>
              <input type="text" value={config.config.max_tokens ?? 'Default'} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelClass}>Max Materials</label>
              <input type="text" value={config.config.max_materials} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <input type="text" value={config.config.is_active ? 'Active' : 'Inactive'} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>

          {config.config.restrictions && (
            <div>
              <label className={labelClass}>Restrictions</label>
              <input type="text" value={JSON.stringify(config.config.restrictions)} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
            </div>
          )}

          <div>
            <label className={labelClass}>Assigned At</label>
            <input type="text" value={new Date(config.assigned_at).toLocaleString()} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        </div>
      )}
    </div>
  );
}
