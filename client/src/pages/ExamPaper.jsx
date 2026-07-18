import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Loader2, Upload, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

export default function ExamPaper() {
  const [materials, setMaterials] = useState([]);
  const [sourceExams, setSourceExams] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sourceExamId, setSourceExamId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pastPapers, setPastPapers] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchMaterials(), fetchPastPapers(), fetchSourceExams()]);
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data } = await api.get('/materials');
      setMaterials(data);
    } catch {
      setError('Failed to load materials');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchSourceExams = async () => {
    try {
      const { data } = await api.get('/exam-papers');
      setSourceExams(data);
    } catch {
      // non-critical
    }
  };

  const fetchPastPapers = async () => {
    try {
      const { data } = await api.get('/exam-papers');
      setPastPapers(data.filter((p) => p.course_id === 'generated'));
    } catch {
      // non-critical
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post('/materials/upload', form);
      await fetchMaterials();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const toggleMaterial = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/exam-papers/generate-questions', {
        material_ids: selectedIds,
        source_exam_id: sourceExamId ? parseInt(sourceExamId) : null,
      });
      setResult(data);
      fetchPastPapers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="w-full max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center">
          <FileText size={20} className="text-on-tertiary-container" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">Exam Paper Generator</h1>
          <p className="font-mono text-xs text-on-surface-variant">Upload materials and generate 3 exam questions</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-error-container text-on-error-container font-mono text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-surface-container-lowest rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
              dragOver ? 'border-primary bg-primary-fixed/10' : 'border-border-subtle hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 size={28} className="animate-spin text-primary" />
                <p className="font-mono text-sm text-on-surface-variant">Uploading & processing...</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-on-surface-variant" />
                <p className="font-mono text-sm font-medium text-on-surface">Drop a file here or click to upload</p>
                <p className="font-mono text-[11px] text-on-surface-variant">PDF, DOCX, PPTX, TXT</p>
              </>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-4">
              Materials ({materials.filter((m) => m.status === 'ready').length} ready)
            </h2>
            {loadingMaterials ? (
              <div className="flex items-center gap-2 py-8 text-on-surface-variant">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-mono text-sm">Loading materials...</span>
              </div>
            ) : materials.length === 0 ? (
              <p className="font-mono text-sm text-on-surface-variant py-8 text-center">Upload materials above to get started.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {materials.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      m.status !== 'ready' ? 'opacity-50 pointer-events-none' :
                      selectedIds.includes(m.id)
                        ? 'bg-primary-fixed border-primary text-on-primary-fixed'
                        : 'bg-surface-container border-border-subtle text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={() => toggleMaterial(m.id)}
                      disabled={m.status !== 'ready'}
                      className="accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium truncate">{m.title}</p>
                      <p className="font-mono text-[11px] text-on-surface-variant">.{m.file_type}</p>
                    </div>
                    {m.status === 'ready' ? (
                      <CheckCircle size={14} className="text-primary flex-shrink-0" />
                    ) : m.status === 'processing' || m.status === 'pending' ? (
                      <Clock size={14} className="text-on-surface-variant flex-shrink-0" />
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-4">Source Exam (Optional)</h2>
            <p className="font-mono text-[11px] text-on-surface-variant mb-3">Select an existing exam paper to use as style reference.</p>
            <select
              value={sourceExamId}
              onChange={(e) => setSourceExamId(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-container px-3 py-2.5 font-mono text-sm text-on-surface appearance-none cursor-pointer"
            >
              <option value="">No source exam</option>
              {sourceExams.map((p) => (
                <option key={p.id} value={p.id}>
                  Paper #{p.paper_number} — {p.created_at?.slice(0, 10)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={selectedIds.length === 0 || generating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-mono text-sm font-semibold border border-solid cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-tertiary text-on-tertiary border-tertiary hover:opacity-90 px-6 py-3"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText size={18} />
                Generate 3 Questions
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-4">Generated Questions</h2>
              <div className="markdown-content prose-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
              </div>
            </div>
          ) : pastPapers.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-4">Previous Generations</h2>
              <div className="space-y-3">
                {pastPapers.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setResult(p)}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-surface-container border border-border-subtle hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <p className="font-mono text-xs text-on-surface-variant">{p.created_at?.slice(0, 10)}</p>
                    <p className="font-mono text-xs text-on-surface mt-1 line-clamp-2">{p.content?.slice(0, 100)}...</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}
