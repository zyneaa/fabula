import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Save } from 'lucide-react';
import api from '../services/api';

export default function SystemSettings() {
  const [config, setConfig] = useState({
    system_prompt: '',
    temperature: 0.7,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    max_tokens: 4096,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    api.get('/system-configs')
      .then(({ data }) => setConfig(data))
      .catch(() => setError('Failed to load system config'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await api.put('/system-configs', config);
      setConfig(data);
      setSuccess('System config saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block font-mono text-sm font-medium mb-2 text-on-surface-variant";
  const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]";

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-on-surface">System Settings</h1>
      </div>

      {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}
      {success && <div className="p-3 rounded-lg mb-6 text-sm bg-[#d1fae5] text-[#065f46]">{success}</div>}

      <form onSubmit={handleSave} className="max-w-3xl">
        <div className="bg-white rounded-lg border border-border-subtle p-6 space-y-6">
          <div>
            <label className={labelClass}>System Prompt</label>
            <textarea
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              className={`${inputClass} min-h-[200px] font-mono text-sm leading-relaxed`}
              placeholder="Default system prompt for all LLM interactions..."
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-on-surface-variant bg-none border-none cursor-pointer hover:text-on-surface"
            >
              {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Advanced Options
            </button>
          </div>

          {showAdvanced && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Top P</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={config.top_p}
                    onChange={(e) => setConfig({ ...config, top_p: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Frequency Penalty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="-2"
                    max="2"
                    value={config.frequency_penalty}
                    onChange={(e) => setConfig({ ...config, frequency_penalty: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Presence Penalty</label>
                  <input
                    type="number"
                    step="0.1"
                    min="-2"
                    max="2"
                    value={config.presence_penalty}
                    onChange={(e) => setConfig({ ...config, presence_penalty: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Tokens</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="128000"
                    value={config.max_tokens}
                    onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
