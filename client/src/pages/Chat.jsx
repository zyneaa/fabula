import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import GeneratedContentViewer from '../components/GeneratedContentViewer';
import {
  Plus, Bot, CloudUpload, X,
  ThumbsUp, ThumbsDown, Copy, Paperclip, Send,
  WandSparkles, ChevronRight, FileQuestion, FileText,
  File, ClipboardList, Menu,
} from 'lucide-react';

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

function conversationTitle(conv) {
  if (conv.title) return conv.title;
  return `Chat #${conv.id}`;
}

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState([]);
  const [showViewer, setShowViewer] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
      fetchMaterials(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data);
      if (data.length > 0) {
        setCurrentConversation(data[0]);
      }
    } catch {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}`);
      setMessages(data.messages);
    } catch {
      setError('Failed to load messages');
    }
  };

  const fetchMaterials = async (conversationId) => {
    try {
      const { data } = await api.get(`/materials/conversation/${conversationId}`);
      setMaterials(data);
    } catch {
      console.error('Failed to load materials');
    }
  };

  const handleNewConversation = async () => {
    try {
      const { data } = await api.post('/chat/conversations');
      const newConv = { id: data.id, created_at: data.created_at, message_count: 0 };
      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
      setMaterials([]);
    } catch {
      setError('Failed to create conversation');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentConversation) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/materials/conversation/${currentConversation.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchMaterials(currentConversation.id);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload material');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Remove this source from the conversation?')) return;
    try {
      await api.delete(`/materials/${materialId}`);
      fetchMaterials(currentConversation.id);
    } catch {
      setError('Failed to delete material');
    }
  };

  const handleGenerateAction = async (action) => {
    if (!currentConversation) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    const actionName = action === 'notes' ? 'Note' : 'Quiz';
    const id = Date.now();
    setGenLog(prev => [...prev, {id, text: `${actionName} generation queued...`, status: 'pending'}]);
    try {
      await api.post(`/${action}/generate/conversation/${currentConversation.id}`);
      setGenLog(prev => prev.map(e => e.id === id ? {...e, text: `${actionName} generation complete`, status: 'done'} : e));
      setSuccess(`${actionName} generation started!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.detail || `Failed to generate ${action}`;
      setGenLog(prev => prev.map(e => e.id === id ? {...e, text: msg, status: 'error'} : e));
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSummarize = async () => {
    if (!currentConversation || sending) return;
    setQuery('Please summarize all the sources in this conversation, highlighting the key insights.');
    setTimeout(() => {
      const form = document.getElementById('chat-form');
      form?.requestSubmit();
    }, 0);
  };

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!query.trim() || !currentConversation || sending) return;

    setSending(true);
    setError('');

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, userMessage]);
    const sentQuery = query;
    setQuery('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const { data } = await api.post(`/chat/conversations/${currentConversation.id}/query`, { query: sentQuery });
      setMessages((prev) => [...prev, data]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversation.id ? { ...c, message_count: c.message_count + 2 } : c
        )
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send query');
    } finally {
      setSending(false);
    }
  };

  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-on-surface-variant">
        <div className="loading-spinner" />
        <span>Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* History overlay */}
      {historyOpen && (
        <div className="absolute inset-0 z-20 flex">
          <section className="w-[300px] bg-surface border-r border-outline-variant flex flex-col overflow-hidden shadow-lg">
            <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center">
              <span className="font-mono text-xs font-medium text-on-surface-variant uppercase tracking-wider">Chat History</span>
              <div className="flex items-center gap-1">
                <button onClick={handleNewConversation} className="bg-none border-none cursor-pointer text-primary p-1.5 rounded-lg transition-colors hover:bg-primary-fixed flex items-center" title="New conversation">
                  <Plus size={18} />
                </button>
                <button onClick={() => setHistoryOpen(false)} className="bg-none border-none cursor-pointer text-on-surface-variant p-1.5 rounded-lg transition-colors hover:bg-surface-container-highest flex items-center" title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-x-hidden overflow-y-auto p-2 flex flex-col gap-0.5 custom-scrollbar">
              {conversations.length === 0 ? (
                <p className="p-6 text-center text-on-surface-variant text-sm">No conversations yet.</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => { setCurrentConversation(conv); setHistoryOpen(false); }}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-container-lowest${
                      currentConversation?.id === conv.id ? ' bg-surface-container-low border-l-2 border-primary pl-2.5' : ''
                    }`}
                  >
                    <p className="font-body text-sm font-semibold text-on-surface leading-tight truncate">{conversationTitle(conv)}</p>
                    <p className="font-mono text-xs font-medium text-on-surface-variant mt-0.5">{formatRelativeTime(conv.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </section>
          <div className="flex-1 bg-black/20" onClick={() => setHistoryOpen(false)} />
        </div>
      )}

      <section className="flex-1 flex flex-col bg-surface-bright overflow-hidden min-w-0">
        {error && <div className="p-3 text-sm bg-error-container text-on-error-container m-0 rounded-none">{error}</div>}
        {success && <div className="p-3 text-sm bg-[#d1fae5] text-[#065f46] m-0 rounded-none">{success}</div>}
        {generating && <div className="p-3 text-sm bg-surface-container text-on-surface m-0 rounded-none flex items-center gap-2"><div className="loading-spinner" style={{width: 14, height: 14, borderWidth: 2}} /><span>Generating...</span></div>}

        <div className="px-4 py-2.5 bg-surface border-b border-outline-variant flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setHistoryOpen(true)} className="bg-none border-none cursor-pointer text-on-surface-variant p-1.5 rounded-lg transition-colors hover:bg-surface-container-highest flex items-center" title="Open history">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-1.5 bg-primary-container rounded-lg text-on-primary-container flex items-center flex-shrink-0">
              <CloudUpload size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mb-0.5">Context Source</span>
              <div className="flex gap-1.5 items-center flex-wrap">
                {materials.map((m) => (
                  <span key={m.id} className="bg-surface-container-highest px-2 py-0.5 rounded-full font-mono text-[11px] font-medium text-on-surface border border-outline-variant inline-flex items-center gap-0.5">
                    {m.title}
                    <button type="button" onClick={() => handleDeleteMaterial(m.id)} className="bg-none border-none cursor-pointer text-on-surface-variant p-0 inline-flex items-center leading-none">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.pptx,.txt" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-none border-none text-primary font-mono text-[11px] font-medium cursor-pointer p-0 hover:underline flex-shrink-0">
                  + Add more
                </button>
              </div>
            </div>
          </div>
        </div>

        {showViewer && currentConversation && (
          <GeneratedContentViewer
            conversationId={currentConversation.id}
            type={showViewer}
            onClose={() => setShowViewer(null)}
          />
        )}

        <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant px-6">
              <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <Bot size={28} />
              </div>
              <p className="font-display text-lg font-semibold text-on-surface mb-1">Ask your knowledge base</p>
              <p className="text-sm text-on-surface-variant">Upload sources and ask questions to get started.</p>
            </div>
          ) : (
            <div className="max-w-[768px] mx-auto flex flex-col gap-6 px-6 py-8">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex flex-col items-end">
                    <div className="max-w-[80%] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] leading-relaxed bg-surface-container-highest text-on-surface rounded-2xl rounded-br-md">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-on-surface-variant mt-1.5">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ) : (
                  <div key={msg.id} className="flex flex-col items-start">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center">
                        <Bot size={16} />
                      </div>
                      <span className="font-mono text-xs font-bold text-primary">Assistant</span>
                    </div>
                    <div className="max-w-[85%] px-5 py-5 bg-surface-container-lowest text-on-surface rounded-2xl rounded-bl-md border border-outline-variant shadow-[0_1px_3px_rgba(0,0,0,0.05)] leading-relaxed">
                      <div className="chat-msg-content text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button type="button" className="flex items-center gap-1 bg-none border-none cursor-pointer text-on-surface-variant font-mono text-[11px] font-medium px-1 py-0.5 transition-colors hover:text-primary">
                        <ThumbsUp size={14} />
                      </button>
                      <button type="button" className="flex items-center gap-1 bg-none border-none cursor-pointer text-on-surface-variant font-mono text-[11px] font-medium px-1 py-0.5 transition-colors hover:text-primary">
                        <ThumbsDown size={14} />
                      </button>
                      <button type="button" onClick={() => handleCopy(msg.content)} className="flex items-center gap-1 bg-none border-none cursor-pointer text-on-surface-variant font-mono text-[11px] font-medium px-1 py-0.5 transition-colors hover:text-primary">
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                  </div>
                )
              )}
              {sending && (
                <div className="flex items-center gap-2 text-on-surface-variant pl-1">
                  <div className="loading-spinner" style={{width: 16, height: 16, borderWidth: 2}} />
                  <span className="font-mono text-xs">Assistant is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <form id="chat-form" onSubmit={handleSendQuery} className="max-w-[768px] mx-auto p-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-end gap-1.5">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-none border-none text-on-surface-variant cursor-pointer p-2 rounded-lg flex items-center transition-colors hover:text-primary hover:bg-surface-container-low">
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onInput={handleTextareaInput}
              placeholder="Ask your knowledge base..."
              disabled={sending}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none font-body text-sm leading-6 text-on-surface max-h-[160px] py-2 placeholder:text-on-surface-variant placeholder:opacity-60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery(e);
                }
              }}
            />
            <button type="submit" disabled={sending || !query.trim()} className="bg-primary text-on-primary border-none p-2.5 rounded-xl cursor-pointer flex items-center transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100">
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>

      <section className="w-[280px] flex-shrink-0 bg-surface border-l border-outline-variant flex flex-col overflow-y-auto hidden lg:flex">
        <div className="px-5 py-4 border-b border-outline-variant">
          <span className="font-mono text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <button type="button" onClick={() => handleGenerateAction('notes')} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-fixed text-primary flex items-center">
                <WandSparkles size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">Generate Note</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Convert chat to markdown</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>

          <button type="button" onClick={() => handleGenerateAction('quizzes')} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-tertiary-fixed text-tertiary flex items-center">
                <FileQuestion size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">Create Quiz</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Test your knowledge</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>

          <button type="button" onClick={handleSummarize} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-container-highest text-secondary flex items-center">
                <FileText size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">Summarize Sources</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Key insights extraction</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>

          <button type="button" onClick={() => setShowViewer('notes')} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left opacity-80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-container-highest text-secondary flex items-center">
                <File size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">View Notes</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Browse generated notes</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>

          <button type="button" onClick={() => setShowViewer('quizzes')} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left opacity-80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-container-highest text-secondary flex items-center">
                <ClipboardList size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">View Quizzes</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Browse generated quizzes</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>
        </div>

        {genLog.length > 0 && (
          <div className="mx-4 mb-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant">
            <h4 className="font-mono text-[11px] font-semibold text-on-surface mb-2 uppercase tracking-wider">Activity Log</h4>
            <div className="flex flex-col gap-1.5">
              {genLog.map(entry => (
                <div key={entry.id} className="flex items-center gap-2 font-mono text-[11px]">
                  {entry.status === 'pending' && <div className="loading-spinner" style={{width: 10, height: 10, borderWidth: 2, flexShrink: 0}} />}
                  {entry.status === 'done' && <span className="text-[#065f46]">&#10003;</span>}
                  {entry.status === 'error' && <span className="text-error">&#10007;</span>}
                  <span className={entry.status === 'error' ? 'text-error' : 'text-on-surface-variant'}>{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto mx-4 mb-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant">
          <h4 className="font-mono text-xs font-semibold text-on-surface mb-2">Workspace Health</h4>
          <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden mb-2">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min((materials.length / 5) * 100, 100)}%` }} />
          </div>
          <p className="font-mono text-[11px] font-medium text-on-surface-variant">{materials.length} / 5 sources used</p>
        </div>
      </section>
    </div>
  );
}
