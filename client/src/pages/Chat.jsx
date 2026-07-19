import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import GeneratedContentViewer from '../components/GeneratedContentViewer';
import {
  Plus, Bot, CloudUpload, X,
  Copy, Paperclip, Send, Square,
  WandSparkles, ChevronRight, FileQuestion, FileText,
  File, ClipboardList, Menu, SlidersHorizontal,
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
  return 'New Chat';
}

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState([]);
  const [showViewer, setShowViewer] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hasConfig, setHasConfig] = useState(null);
  const [maxMaterials, setMaxMaterials] = useState(25);
  const [maxTokens, setMaxTokens] = useState(100000);
  const [renamingConvId, setRenamingConvId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [greetingText] = useState(() => {
    const greetings = ['What would you like to learn today?', 'What sparks your curiosity?', 'Ready to explore something new?', 'What question is on your mind?'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  });
  const [glowDots] = useState(() =>
    Array.from({ length: 5 }, (_, i) => ({
      top: `${10 + Math.random() * 70}%`,
      left: `${10 + Math.random() * 70}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${4 + Math.random() * 4}s`,
      size: 4 + Math.random() * 6,
      anim: `float${(i % 3) + 1}`,
    }))
  );
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    fetchConversations();
    checkConfig();
  }, []);

  const checkConfig = async () => {
    if (user?.role === 'student') {
      try {
        const { data } = await api.get('/llm-configs/me');
        setHasConfig(true);
        setMaxMaterials(data.config.max_materials ?? 25);
        setMaxTokens(data.config.max_tokens ?? 100000);
        return;
      } catch {
        setHasConfig(false);
        return;
      }
    }

    try {
      const sysRes = await api.get('/system-configs');
      setMaxMaterials(sysRes.data.max_materials ?? 25);
      setMaxTokens(sysRes.data.max_tokens ?? 100000);
    } catch {
      setMaxMaterials(25);
      setMaxTokens(100000);
    }
    setHasConfig(true);
  };

  useEffect(() => {
    if (currentConversation && !skipNextFetch.current) {
      fetchMessages(currentConversation.id);
      fetchMaterials(currentConversation.id);
    }
    skipNextFetch.current = false;
  }, [currentConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data);
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

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setMaterials([]);
    setGenLog([]);
    setError('');
    setSuccess('');
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
    if (!hasConfig) return;
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

  const handleStartRename = (conv) => {
    setRenamingConvId(conv.id);
    setRenameText(conv.title || '');
  };

  const handleSubmitRename = async (convId) => {
    const text = renameText.trim();
    if (!text) {
      setRenamingConvId(null);
      return;
    }
    try {
      await api.patch(`/chat/conversations/${convId}`, { title: text });
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: text } : c))
      );
      if (currentConversation?.id === convId) {
        setCurrentConversation((prev) => ({ ...prev, title: text }));
      }
    } catch {
      setError('Failed to rename');
    } finally {
      setRenamingConvId(null);
    }
  };

  const handleDeleteConversation = async (convId) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await api.delete(`/chat/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConversation?.id === convId) setCurrentConversation(null);
    } catch {
      setError('Failed to delete conversation');
    }
  };

  const handleSummarize = async () => {
    if (!currentConversation || streaming) return;
    if (!hasConfig) return;
    setQuery('Please summarize all the sources in this conversation, highlighting the key insights.');
    setTimeout(() => {
      const form = document.getElementById('chat-form');
      form?.requestSubmit();
    }, 0);
  };

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!query.trim() || streaming) return;
    if (!hasConfig) return;

    setStreaming(true);
    setError('');

    const sentQuery = query;
    setQuery('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      let convId, convData;
      const isNew = !currentConversation;

      if (isNew) {
        const { data: newConv } = await api.post('/chat/conversations');
        convData = { id: newConv.id, created_at: newConv.created_at, message_count: 0 };
        skipNextFetch.current = true;
        setCurrentConversation(convData);
        setMessages([]);
        setMaterials([]);
        convId = newConv.id;
      } else {
        convId = currentConversation.id;
        convData = currentConversation;
      }

      // Add user message immediately
      const userMsgId = Date.now();
      setMessages((prev) => [...prev, {
        id: userMsgId,
        role: 'user',
        content: sentQuery,
        created_at: new Date().toISOString(),
      }]);

// Create empty assistant message for streaming
      const streamMsgId = userMsgId + 1;
      setMessages((prev) => [...prev, {
        id: streamMsgId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        _streaming: true,
        _thinking: true,
      }]);

      // Fetch full response from backend
      const { data } = await api.post(`/chat/conversations/${convId}/query`, { query: sentQuery });
      const fullContent = data.content;

      // Remove thinking indicator, start streaming
      setMessages((prev) =>
        prev.map((m) => m.id === streamMsgId
          ? { ...m, _thinking: false }
          : m
        )
      );

      // Stream the response character by character on the frontend
      for (let i = 0; i < fullContent.length; i++) {
        await new Promise(r => setTimeout(r, 2));
        setMessages((prev) =>
          prev.map((m) => m.id === streamMsgId
            ? { ...m, content: m.content + fullContent[i] }
            : m
          )
        );
      }

      // Replace streaming message with final message from server
      setMessages((prev) =>
        prev.map((m) => m.id === streamMsgId
          ? { id: data.id, role: 'assistant', content: data.content, created_at: data.created_at }
          : m
        )
      );

      if (isNew) {
        setConversations((prev) => [convData, ...prev]);
        api.post(`/chat/conversations/${convId}/generate-title`).then(({ data: titleData }) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, title: titleData.title } : c))
          );
          setCurrentConversation((prev) =>
            prev?.id === convId ? { ...prev, title: titleData.title } : prev
          );
        }).catch(() => {});
      }
    } catch (err) {
      // On error, mark streaming message as done (keep partial content)
      setMessages((prev) =>
        prev.map((m) => m._streaming ? { ...m, _streaming: false } : m)
      );
      setError(err?.message || 'Failed to send query');
    } finally {
      setStreaming(false);
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
    <div className="flex flex-col flex-1 overflow-hidden relative">
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
                    onClick={() => { if (renamingConvId !== conv.id) { setCurrentConversation(conv); setHistoryOpen(false); } }}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-surface-container-lowest${
                      currentConversation?.id === conv.id ? ' bg-surface-container-low border-l-2 border-primary pl-2.5' : ''
                    }`}
                  >
                    {renamingConvId === conv.id ? (
                      <input
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onBlur={() => handleSubmitRename(conv.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitRename(conv.id); } if (e.key === 'Escape') setRenamingConvId(null); }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-surface-container-highest border border-primary rounded px-2 py-1 font-body text-sm font-semibold text-on-surface outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <p className="font-body text-sm font-semibold text-on-surface leading-tight truncate flex-1">{conversationTitle(conv)}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartRename(conv); }}
                          className="opacity-0 group-hover:opacity-100 bg-none border-none text-on-surface-variant cursor-pointer p-0.5 rounded transition-opacity hover:text-primary flex items-center flex-shrink-0"
                          title="Rename"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                          className="opacity-0 group-hover:opacity-100 bg-none border-none text-on-surface-variant cursor-pointer p-0.5 rounded transition-opacity hover:text-error flex items-center flex-shrink-0"
                          title="Delete"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                    <p className="font-mono text-xs font-medium text-on-surface-variant mt-0.5">{formatRelativeTime(conv.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </section>
          <div className="flex-1 bg-black/20" onClick={() => setHistoryOpen(false)} />
        </div>
      )}

      <div className="flex border-b border-outline-variant bg-surface flex-shrink-0">
        <div className="flex-1 flex items-center gap-3 px-4 py-2.5 min-w-0">
          <button onClick={() => setHistoryOpen(true)} className="bg-none border-none cursor-pointer text-on-surface-variant p-1.5 rounded-lg transition-colors hover:bg-surface-container-highest flex items-center" title="Open history">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-1.5 bg-primary-container rounded-lg text-on-primary-container flex items-center flex-shrink-0">
              <CloudUpload size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mb-0.5 inline-flex items-center gap-1.5">
                <span className="w-1 h-1 bg-outline-variant rotate-45 flex-shrink-0" />
                Context Source
              </span>
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
        <div className="w-[280px] flex-shrink-0 flex items-center px-5 py-2.5 border-l border-outline-variant gap-3">
          <span className="w-1.5 h-1.5 bg-outline-variant rotate-45 flex-shrink-0" />
          <span className="font-mono text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col bg-surface-bright overflow-hidden min-w-0 relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-[900px] h-[500px] rounded-[50%] opacity-20 pointer-events-none" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', filter: 'blur(80px)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            {!currentConversation && messages.length === 0 && glowDots.map((dot, i) => (
              <div key={i} className="absolute rounded-full pointer-events-none" style={{ width: dot.size, height: dot.size, top: dot.top, left: dot.left, background: 'var(--primary)', boxShadow: '0 0 12px 4px var(--primary)', animation: `${dot.anim} ${dot.duration}s ease-in-out ${dot.delay} infinite`, opacity: 0.5 }} />
            ))}
          </div>
          {error && <div className="p-3 text-sm bg-error-container text-on-error-container m-0 rounded-none">{error}</div>}
          {success && <div className="p-3 text-sm bg-[#d1fae5] text-[#065f46] m-0 rounded-none">{success}</div>}
          {generating && <div className="p-3 text-sm bg-surface-container text-on-surface m-0 rounded-none flex items-center gap-2"><div className="loading-spinner" style={{width: 14, height: 14, borderWidth: 2}} /><span>Generating...</span></div>}

          {showViewer && currentConversation && (
          <GeneratedContentViewer
            conversationId={currentConversation.id}
            type={showViewer}
            onClose={() => setShowViewer(null)}
          />
        )}

        <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar relative z-10">
          {!hasConfig && user?.role === 'student' ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center mb-4">
                <SlidersHorizontal size={28} />
              </div>
              <p className="font-display text-lg font-semibold text-on-surface mb-1">No LLM Config Assigned</p>
              <p className="text-sm text-on-surface-variant max-w-sm">
                You need an LLM configuration to use chat, generate notes, and create quizzes. Contact your teacher to get one assigned.
              </p>
            </div>
          ) : !currentConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 greeting-enter relative z-10">
              <p className="font-mono text-2xl sm:text-3xl font-semibold uppercase tracking-wider text-on-surface relative py-10">
                {greetingText}
              </p>
              <div className="w-full max-w-[640px] p-2 bg-surface rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-end gap-1.5 relative">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onInput={handleTextareaInput}
                  placeholder="Ask anything..."
                  disabled={streaming || !hasConfig}
                  rows={1}
                  autoFocus
                  className="flex-1 bg-surface border-none outline-none resize-none font-body text-sm leading-6 text-on-surface max-h-[160px] py-2 px-3 placeholder:text-on-surface-variant placeholder:opacity-60 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && hasConfig) {
                      e.preventDefault();
                      handleSendQuery(e);
                    }
                  }}
                />
                <button type="button" onClick={(e) => handleSendQuery(e)} disabled={streaming || !query.trim() || !hasConfig} title={!hasConfig ? 'No LLM config assigned' : ''} className="bg-primary text-on-primary border-none p-2.5 rounded-xl cursor-pointer flex items-center transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100">
                  <Send size={18} />
                </button>
              </div>
            </div>
          ) : messages.length === 0 && currentConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant px-6 relative">
              <span className="absolute top-2 left-2 font-mono text-sm text-outline-variant select-none leading-none font-bold">&#x250F;</span>
              <span className="absolute top-2 right-2 font-mono text-sm text-outline-variant select-none leading-none font-bold">&#x2513;</span>
              <span className="absolute bottom-2 left-2 font-mono text-sm text-outline-variant select-none leading-none font-bold">&#x2517;</span>
              <span className="absolute bottom-2 right-2 font-mono text-sm text-outline-variant select-none leading-none font-bold">&#x251B;</span>
              <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <Bot size={28} />
              </div>
              <p className="font-display text-lg font-semibold text-on-surface mb-1">Ask your knowledge base</p>
              <p className="text-sm text-on-surface-variant">Upload sources and ask questions to get started.</p>
            </div>
          ) : (
            <div className="max-w-[768px] mx-auto flex flex-col gap-8 px-6 py-8 chat-messages-enter">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex flex-col items-end">
                    <div className="max-w-[80%] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] leading-relaxed bg-white text-on-surface rounded-2xl rounded-br-md">
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
                    <div className="max-w-[85%] px-0 py-2 bg-transparent text-on-surface leading-relaxed">
                      <div className="markdown-content text-sm">
                        {msg._thinking ? (
                          <div className="flex items-center gap-2 text-on-surface-variant pl-1">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{animationDelay: '0ms'}} />
                              <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{animationDelay: '150ms'}} />
                              <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{animationDelay: '300ms'}} />
                            </div>
                            <span className="font-mono text-xs">Thinking...</span>
                          </div>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                    {!msg._streaming && (
                    <div className="flex gap-3 mt-2">
                      <button type="button" onClick={() => handleCopy(msg.content)} className="flex items-center gap-1 bg-none border-none cursor-pointer text-on-surface-variant font-mono text-[11px] font-medium px-1 py-0.5 transition-colors hover:text-primary">
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    )}
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {currentConversation && (
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <form id="chat-form" onSubmit={handleSendQuery} className="max-w-[768px] mx-auto p-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-end gap-1.5">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!hasConfig} title={!hasConfig ? 'No LLM config assigned' : ''} className="bg-none border-none text-on-surface-variant cursor-pointer p-2 rounded-lg flex items-center transition-colors hover:text-primary hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant disabled:hover:bg-transparent">
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onInput={handleTextareaInput}
              placeholder={!hasConfig ? 'No LLM config assigned...' : 'Ask your knowledge base...'}
              disabled={streaming || !hasConfig}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none font-body text-sm leading-6 text-on-surface max-h-[160px] py-2 placeholder:text-on-surface-variant placeholder:opacity-60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && hasConfig) {
                  e.preventDefault();
                  handleSendQuery(e);
                }
              }}
            />
            {streaming ? (
              <button type="button" disabled className="bg-primary text-on-primary border-none p-2.5 rounded-xl cursor-pointer flex items-center transition-opacity opacity-70">
                <Send size={18} />
              </button>
            ) : (
              <button type="submit" disabled={!query.trim() || !hasConfig} title={!hasConfig ? 'No LLM config assigned' : ''} className="bg-primary text-on-primary border-none p-2.5 rounded-xl cursor-pointer flex items-center transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100">
                <Send size={18} />
              </button>
            )}
          </form>
        </div>
        )}
      </section>

      <section className="w-[280px] flex-shrink-0 bg-surface border-l border-outline-variant flex flex-col overflow-y-auto hidden lg:flex">
        <div className="flex flex-col gap-3 p-4">
          <button type="button" onClick={() => handleGenerateAction('notes')} disabled={!hasConfig} title={!hasConfig ? 'No LLM config assigned' : ''} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-container text-on-primary-container flex items-center">
                <WandSparkles size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">Generate Note</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Convert chat to markdown</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>

          <button type="button" onClick={() => handleGenerateAction('quizzes')} disabled={!hasConfig} title={!hasConfig ? 'No LLM config assigned' : ''} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center">
                <FileQuestion size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-body text-sm font-semibold text-on-surface">Create Quiz</span>
                <span className="font-mono text-[11px] font-medium text-on-surface-variant">Test your knowledge</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant" />
          </button>

          <button type="button" onClick={handleSummarize} disabled={!hasConfig} title={!hasConfig ? 'No LLM config assigned' : ''} className="flex items-center justify-between w-full px-4 py-3 bg-white border border-outline-variant rounded-lg cursor-pointer transition-[border-color,box-shadow] hover:border-primary hover:shadow-[0_2px_8px_rgba(85,87,160,0.1)] text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-on-secondary flex items-center">
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
              <div className="p-2 rounded-lg bg-primary-fixed text-primary flex items-center">
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
              <div className="p-2 rounded-lg bg-tertiary-fixed text-tertiary flex items-center">
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

        <div className="mx-4 mb-2 flex items-center gap-2 text-outline-variant">
          <div className="flex-1 h-px bg-outline-variant" />
          <span className="w-1.5 h-1.5 bg-outline-variant rotate-45 flex-shrink-0" />
          <div className="flex-1 h-px bg-outline-variant" />
        </div>

        <div className="mt-auto mx-4 mb-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant">
          <h4 className="font-mono text-xs font-semibold text-on-surface mb-2">Token Limit</h4>
          <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden mb-2">
            <div className="h-full bg-tertiary rounded-full transition-all duration-300" style={{ width: `${Math.min((messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0) / maxTokens) * 100, 100)}%` }} />
          </div>
          <p className="font-mono text-[11px] font-medium text-on-surface-variant">{messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0).toLocaleString()} / {maxTokens.toLocaleString()} tokens used</p>
        </div>

        <div className="mx-4 mb-2 flex items-center gap-2 text-outline-variant">
          <div className="flex-1 h-px bg-outline-variant" />
          <span className="w-1.5 h-1.5 bg-outline-variant rotate-45 flex-shrink-0" />
          <div className="flex-1 h-px bg-outline-variant" />
        </div>

        <div className="mx-4 mb-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant">
          <h4 className="font-mono text-xs font-semibold text-on-surface mb-2">Workspace Health</h4>
          <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden mb-2">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min((materials.length / maxMaterials) * 100, 100)}%` }} />
          </div>
          <p className="font-mono text-[11px] font-medium text-on-surface-variant">{materials.length} / {maxMaterials} sources used</p>
        </div>
      </section>
      </div>
    </div>
  );
}
