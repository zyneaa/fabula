import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const statusBadgeClass = (status) => {
  switch (status) {
    case 'ready': return 'bg-primary-container text-on-primary-container';
    case 'failed': return 'bg-error-container text-on-error-container';
    default: return 'bg-secondary-container text-on-secondary-container';
  }
};

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data } = await api.get('/materials');
      setMaterials(data);
    } catch (err) {
      setError('Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchMaterials();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await api.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      setError('Failed to delete material.');
    }
  };

  if (loading) return <p>Loading materials...</p>;

  return (
    <div className="max-w-container mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-on-surface">Study Materials</h1>
      </div>

      {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}

      <div className="mb-6 p-6 bg-surface-container border-2 border-dashed border-outline-variant rounded-lg text-center">
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".pdf,.docx,.pptx,.txt" disabled={uploading} />
        <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed w-auto">
          {uploading ? 'Uploading...' : 'Upload a File'}
        </button>
        <p className="text-text-muted text-sm mt-2">Supported file types: PDF, DOCX, PPTX, TXT</p>
      </div>

      <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Title</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Type</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Status</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle">Uploaded</th>
              <th className="px-4 py-4 text-left font-mono text-xs font-medium uppercase text-on-surface-variant border-b border-border-subtle"></th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td className="px-4 py-4 border-b border-border-subtle">{material.title}</td>
                <td className="px-4 py-4 border-b border-border-subtle">{material.file_type}</td>
                <td className="px-4 py-4 border-b border-border-subtle">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${statusBadgeClass(material.status)}`}>{material.status}</span>
                </td>
                <td className="px-4 py-4 border-b border-border-subtle">{new Date(material.uploaded_at).toLocaleDateString()}</td>
                <td className="px-4 py-4 border-b border-border-subtle">
                  <button onClick={() => handleDelete(material.id)} className="inline-flex items-center justify-center rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high px-3 py-1.5 w-auto">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
