import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/materials');
      setMaterials(res.data);
    } catch (err) {
      setError('Failed to load materials');
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
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      await api.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      setError('Failed to delete material');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h2>Study Materials</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="file"
            onChange={handleUpload}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.pptx,.txt"
          />
          <span style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', borderRadius: '5px' }}>
            {uploading ? 'Uploading...' : 'Upload File'}
          </span>
        </label>
        <small style={{ marginLeft: '10px', color: '#666' }}>PDF, DOCX, PPTX, TXT</small>
      </div>

      {materials.length === 0 ? (
        <p>No materials uploaded yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Uploaded</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{material.title}</td>
                <td style={{ padding: '10px' }}>{material.file_type}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '3px',
                    backgroundColor: material.status === 'ready' ? '#d4edda' : 
                                   material.status === 'failed' ? '#f8d7da' : '#fff3cd',
                  }}>
                    {material.status}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  {new Date(material.uploaded_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => handleDelete(material.id)}
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
