import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUniInfo();
    }, []);

    const fetchUniInfo = async () => {
        try {
            const { data } = await api.get('/uni-info/');
            setUniInfo(data);
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
            const method = editingId ? 'put' : 'post';
            const url = editingId ? `/uni-info/${editingId}` : '/uni-info/';
            await api[method](url, formData);
            fetchUniInfo();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.detail || 'Operation failed');
        }
    };

    const handleEdit = (item) => {
        setFormData({ category: item.category, title: item.title, content: item.content });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        try {
            await api.delete(`/uni-info/${id}`);
            fetchUniInfo();
        } catch (err) {
            setError('Failed to delete entry');
        }
    };

    const resetForm = () => {
        setFormData({ category: 'course', title: '', content: '' });
        setEditingId(null);
        setShowForm(false);
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title">University Information</h1>
                {user?.role !== 'student' && (
                    <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="btn btn-primary" style={{width: 'auto'}}>
                        {showForm ? 'Cancel' : '+ New Entry'}
                    </button>
                )}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {showForm && (
                <form onSubmit={handleSubmit} style={{ maxWidth: '600px', marginBottom: 'var(--gutter)' }}>
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className="form-input">
                            <option value="course">Course</option>
                            <option value="timetable">Timetable</option>
                            <option value="event">Event</option>
                            <option value="directory">Directory</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="form-input" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Content</label>
                        <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={5} className="form-input" />
                    </div>
                    <button type="submit" className="btn btn-primary">{editingId ? 'Update Entry' : 'Create Entry'}</button>
                </form>
            )}

            <div className="card-grid">
                {uniInfo.map((item) => (
                    <div key={item.id} className="uni-info-card">
                        <div className="uni-info-card-header">
                            <div>
                                <span className="badge badge-secondary">{item.category}</span>
                                <h3 className="uni-info-card-title">{item.title}</h3>
                            </div>
                            {user?.role !== 'student' && (
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <button onClick={() => handleEdit(item)} className="btn btn-secondary" style={{width: 'auto', padding: '8px 12px'}}>Edit</button>
                                    <button onClick={() => handleDelete(item.id)} className="btn btn-secondary" style={{width: 'auto', padding: '8px 12px'}}>Delete</button>
                                </div>
                            )}
                        </div>
                        <div className="uni-info-card-content markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
