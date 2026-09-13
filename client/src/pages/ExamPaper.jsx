import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Loader2, Upload, CheckCircle, Clock, Download, Trash2 } from 'lucide-react';
import api from '../services/api';

const inputRow = (selected, disabled) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
    disabled ? 'opacity-50 pointer-events-none' :
    selected
      ? 'bg-primary-fixed border-primary text-on-primary-fixed'
      : 'bg-surface-container border-border-subtle text-on-surface hover:bg-surface-container-high'
  }`;

const dropZone = (dragOver) =>
  `bg-surface-container-lowest rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
    dragOver ? 'border-primary bg-primary-fixed/10' : 'border-border-subtle hover:border-primary/50'
  }`;

export default function ExamPaper() {
  const [sourceMaterials, setSourceMaterials] = useState([]);
  const [exampleMaterials, setExampleMaterials] = useState([]);
  const [sourceIds, setSourceIds] = useState([]);
  const [exampleIds, setExampleIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [papers, setPapers] = useState([]);
  const [pastPapers, setPastPapers] = useState([]);
  const [activePaper, setActivePaper] = useState(0);
  const [numPapers, setNumPapers] = useState(3);
  const [error, setError] = useState('');
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [uploading, setUploading] = useState(null); // 'material' | 'example'
  const [dragOver, setDragOver] = useState(null);
  const sourceInputRef = useRef(null);
  const exampleInputRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const { data } = await api.get('/materials');
      setSourceMaterials(data.filter((m) => m.kind === 'material'));
      setExampleMaterials(data.filter((m) => m.kind === 'example'));
    } catch {
      setError('Failed to load materials');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const errMsg = (err) => {
    const d = err.response?.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((e) => `${(e.loc || []).join('.')}: ${e.msg}`).join('; ');
    if (d?.msg) return d.msg;
    return err.message || 'Request failed';
  };

  const uploadFile = async (file, kind) => {
    setUploading(kind);
    setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind === 'example' ? 'example' : 'material');
    try {
      const { data } = await api.post('/materials/upload', form);
      if (data.kind === 'example') {
        setExampleMaterials((prev) => [data, ...prev]);
      } else {
        setSourceMaterials((prev) => [data, ...prev]);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setUploading(null);
    }
  };

  const handleFiles = (files, kind) => {
    for (const file of files || []) uploadFile(file, kind);
  };

  const handleDrop = (kind) => (e) => {
    e.preventDefault();
    setDragOver(null);
    handleFiles(e.dataTransfer.files, kind);
  };

  const handleFileSelect = (kind) => (e) => {
    handleFiles(e.target.files, kind);
    e.target.value = '';
  };

  const toggle = (list, setList, id) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const removeMaterial = async (m) => {
    setError('');
    try {
      await api.delete(`/materials/${m.id}`);
      setSourceMaterials((prev) => prev.filter((x) => x.id !== m.id));
      setExampleMaterials((prev) => prev.filter((x) => x.id !== m.id));
      setSourceIds((prev) => prev.filter((x) => x !== m.id));
      setExampleIds((prev) => prev.filter((x) => x !== m.id));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleGenerate = async () => {
    if (sourceIds.length === 0) {
      setError('Select at least one source material.');
      return;
    }
    setGenerating(true);
    setError('');
    setPapers([]);
    setProgress('Queued...');
    try {
      const { data } = await api.post('/exam-papers/generate-questions', {
        material_ids: sourceIds,
        example_material_ids: exampleIds,
        num_papers: numPapers,
      });
      // Poll the job until done (avoids server timeouts on long LLM runs)
      for (let i = 0; i < 240; i++) {
        await sleep(3000);
        const { data: job } = await api.get(`/exam-papers/jobs/${data.job_id}`);
        if (job.status === 'done') {
          setPapers(job.papers);
          setActivePaper(0);
          break;
        }
        if (job.status === 'failed') {
          setError(job.error || 'Generation failed');
          break;
        }
        if (job.status === 'running') {
          setProgress(`Generating paper ${Math.min(Math.floor(i / numPapers) + 1, numPapers)} of ${numPapers}...`);
        }
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setGenerating(false);
      setProgress('');
    }
  };

  const fetchPastPapers = async () => {
    try {
      const { data } = await api.get('/exam-papers');
      setPastPapers(data);
    } catch {
      // non-critical
    }
  };

  const removeSavedPaper = async (id) => {
    setError('');
    try {
      await api.delete(`/exam-papers/${id}`);
      setPastPapers((prev) => prev.filter((p) => p.id !== id));
      setPapers((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  useEffect(() => {
    fetchPastPapers();
  }, [papers]);

  const downloadMd = () => {
    const paper = papers[activePaper];
    if (!paper?.content) return;
    const blob = new Blob([paper.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-paper-${paper.paper_number || activePaper + 1}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
          <p className="font-mono text-xs text-on-surface-variant">Full papers (100 marks each) matching your example paper</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-error-container text-on-error-container font-mono text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-1">
              Course Materials
            </h2>
            <p className="font-mono text-[11px] text-on-surface-variant mb-3">Question content comes from these files.</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver('material'); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={handleDrop('material')}
              onClick={() => sourceInputRef.current?.click()}
              className={dropZone(dragOver === 'material')}
            >
              <input
                ref={sourceInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileSelect('material')}
                className="hidden"
              />
              {uploading === 'material' ? (
                <>
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <p className="font-mono text-sm text-on-surface-variant">Uploading & processing...</p>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-on-surface-variant" />
                  <p className="font-mono text-sm font-medium text-on-surface">Drop course material files here</p>
                  <p className="font-mono text-[11px] text-on-surface-variant">PDF, DOCX, PPTX, TXT</p>
                </>
              )}
            </div>
            {loadingMaterials ? (
              <div className="flex items-center gap-2 py-6 text-on-surface-variant">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-mono text-sm">Loading...</span>
              </div>
            ) : sourceMaterials.length === 0 ? (
              <p className="font-mono text-sm text-on-surface-variant py-6 text-center">No course materials uploaded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto mt-3">
                {sourceMaterials.map((m) => (
                  <label key={m.id} className={inputRow(sourceIds.includes(m.id), m.status !== 'ready')}>
                    <input
                      type="checkbox"
                      checked={sourceIds.includes(m.id)}
                      onChange={() => toggle(sourceIds, setSourceIds, m.id)}
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
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); removeMaterial(m); }}
                      className="bg-none border-none cursor-pointer p-1 text-on-surface-variant hover:text-error flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-1">
              Example Exam Paper
            </h2>
            <p className="font-mono text-[11px] text-on-surface-variant mb-3">
              The generated papers will replicate this paper's structure exactly.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver('example'); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={handleDrop('example')}
              onClick={() => exampleInputRef.current?.click()}
              className={dropZone(dragOver === 'example')}
            >
              <input
                ref={exampleInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileSelect('example')}
                className="hidden"
              />
              {uploading === 'example' ? (
                <>
                  <Loader2 size={24} className="animate-spin text-tertiary" />
                  <p className="font-mono text-sm text-on-surface-variant">Uploading & processing...</p>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-on-surface-variant" />
                  <p className="font-mono text-sm font-medium text-on-surface">Drop example exam paper here</p>
                  <p className="font-mono text-[11px] text-on-surface-variant">Used as format reference only</p>
                </>
              )}
            </div>
            {exampleMaterials.length === 0 ? (
              <p className="font-mono text-sm text-on-surface-variant py-6 text-center">No example paper uploaded yet (optional but recommended).</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto mt-3">
                {exampleMaterials.map((m) => (
                  <div key={m.id} className={inputRow(exampleIds.includes(m.id), m.status !== 'ready')}>
                    <input
                      type="checkbox"
                      checked={exampleIds.includes(m.id)}
                      onChange={() => toggle(exampleIds, setExampleIds, m.id)}
                      disabled={m.status !== 'ready'}
                      className="accent-tertiary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium truncate">{m.title}</p>
                      <p className="font-mono text-[11px] text-on-surface-variant">.{m.file_type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); removeMaterial(m); }}
                      className="bg-none border-none cursor-pointer p-1 text-on-surface-variant hover:text-error flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
            <label className="block font-mono text-sm font-medium mb-2 text-on-surface-variant" htmlFor="num-papers">
              Number of papers to generate (100 marks each)
            </label>
            <input
              id="num-papers"
              type="number"
              min="1"
              max="10"
              value={numPapers}
              onChange={(e) => setNumPapers(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
              className="w-32 px-4 py-2.5 font-mono text-sm border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:border-primary"
            />
            <p className="font-mono text-[11px] text-on-surface-variant mt-1.5">Each paper = 1 LLM run. More papers = longer wait.</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || sourceIds.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-mono text-sm font-semibold border border-solid cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-tertiary text-on-tertiary border-tertiary hover:opacity-90 px-6 py-3"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {progress || 'Generating...'}
              </>
            ) : (
              <>
                <FileText size={18} />
                Generate {numPapers} Paper{numPapers > 1 ? 's' : ''} (100 marks)
              </>
            )}
          </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface">
              Generated Papers
              {papers[activePaper]?.created_at && (
                <span className="ml-2 normal-case font-normal text-on-surface-variant">
                  {new Date(papers[activePaper].created_at).toLocaleString()}
                </span>
              )}
            </h2>
            {papers.length > 0 && (
              <button
                onClick={downloadMd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border border-solid cursor-pointer transition-colors bg-primary text-on-primary hover:opacity-90"
              >
                <Download size={14} />
                Download .md
              </button>
            )}
          </div>
          {papers.length > 0 ? (
            <>
              {papers.length > 1 && (
                <div className="flex gap-2 mb-4">
                  {papers.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePaper(i)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border cursor-pointer transition-colors ${
                        i === activePaper
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container border-border-subtle text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      Paper {p.paper_number || i + 1}
                    </button>
                  ))}
                </div>
              )}
              <div className="markdown-content prose-sm max-h-[600px] overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{papers[activePaper].content}</ReactMarkdown>
              </div>
            </>
          ) : (
            <ol className="font-mono text-xs text-on-surface-variant space-y-2 list-decimal list-inside">
              <li>Upload course materials (content source) and an example exam paper (format source) — each in its own box.</li>
              <li>Tick the files to use.</li>
              <li>Generate — full papers worth exactly 100 marks each, matching your example's structure, with answer keys.</li>
              <li>Switch between papers with the tabs and download any of them as .md.</li>
            </ol>
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface mb-4">
            My Saved Papers
          </h2>
          {pastPapers.length === 0 ? (
            <p className="font-mono text-sm text-on-surface-variant py-4 text-center">No papers saved yet. Generated papers are saved here automatically.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {pastPapers.map((p) => (
                <div
                  key={p.id}
                  onClick={async () => {
                    setError('');
                    try {
                      const { data: full } = await api.get(`/exam-papers/${p.id}`);
                      setPapers([{ id: full.id, paper_number: full.paper_number, content: full.content, created_at: full.created_at }]);
                      setActivePaper(0);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } catch (err) {
                      setError(errMsg(err));
                    }
                  }}
                  className="relative w-full text-left px-4 py-3 pr-10 rounded-lg bg-surface-container border border-border-subtle hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <p className="font-mono text-xs text-on-surface-variant">
                    Paper #{p.paper_number} — {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                  </p>
                  <p className="font-mono text-xs text-on-surface mt-1 line-clamp-2">{p.content?.slice(0, 120)}...</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSavedPaper(p.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-1 text-on-surface-variant hover:text-error"
                    title="Delete paper"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}