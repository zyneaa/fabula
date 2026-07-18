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

    const inputClass = "block w-full px-4 py-3 font-body text-base border border-outline-variant rounded-lg bg-surface text-on-surface transition-[border-color,box-shadow] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent)]";
    const labelClass = "block font-mono text-sm font-medium mb-2 text-on-surface-variant";
    const btnClass = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors no-underline bg-primary text-on-primary hover:opacity-90 w-auto";

    if (loading) return <p>Loading...</p>;

    return (
        <div className="max-w-container mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="font-display text-3xl font-semibold text-on-surface">University Information</h1>
                {user?.role !== 'student' && (
                    <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className={btnClass}>
                        {showForm ? 'Cancel' : '+ New Entry'}
                    </button>
                )}
            </div>

            {error && <div className="p-3 rounded-lg mb-6 text-sm bg-error-container text-on-error-container">{error}</div>}

            {showForm && (
                <form onSubmit={handleSubmit} style={{ maxWidth: '600px', marginBottom: '24px' }}>
                    <div className="mb-6">
                        <label className={labelClass}>Category</label>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className={inputClass}>
                            <option value="course">Course</option>
                            <option value="timetable">Timetable</option>
                            <option value="event">Event</option>
                            <option value="directory">Directory</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label className={labelClass}>Title</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className={inputClass} />
                    </div>
                    <div className="mb-6">
                        <label className={labelClass}>Content</label>
                        <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={5} className={inputClass} />
                    </div>
                    <button type="submit" className={btnClass}>{editingId ? 'Update Entry' : 'Create Entry'}</button>
                </form>
            )}

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                {uniInfo.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-border-subtle p-6 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium capitalize bg-secondary-container text-on-secondary-container">{item.category}</span>
                                <h3 className="font-display text-xl font-semibold mt-2">{item.title}</h3>
                            </div>
                            {user?.role !== 'student' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(item)} className="inline-flex items-center justify-center rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high px-3 py-1.5 w-auto">Edit</button>
                                    <button onClick={() => handleDelete(item.id)} className="inline-flex items-center justify-center rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high px-3 py-1.5 w-auto">Delete</button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 mb-4 markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
