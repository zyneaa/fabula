import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const statusBadgeClass = (status) => {
  switch (status) {
    case 'ready': return 'badge-primary';
    case 'failed': return 'badge-error';
    default: return 'badge-secondary';
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
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Study Materials</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="upload-section">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.pptx,.txt"
          disabled={uploading}
        />
        <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="btn btn-primary" style={{width: 'auto'}}>
          {uploading ? 'Uploading...' : 'Upload a File'}
        </button>
        <p className="text-muted" style={{marginTop: '8px'}}>Supported file types: PDF, DOCX, PPTX, TXT</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>{material.title}</td>
                <td>{material.file_type}</td>
                <td><span className={`badge ${statusBadgeClass(material.status)}`}>{material.status}</span></td>
                <td>{new Date(material.uploaded_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDelete(material.id)} className="btn btn-secondary" style={{width: 'auto'}}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
