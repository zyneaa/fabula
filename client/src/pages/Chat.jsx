import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import GeneratedContentViewer from '../components/GeneratedContentViewer';
import {
  Plus, Bot, CloudUpload, X,
  ThumbsUp, ThumbsDown, Copy, Paperclip, Send,
  WandSparkles, ChevronRight, FileQuestion, FileText,
  File, ClipboardList,
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
  const [showViewer, setShowViewer] = useState(null);
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
    const endpoint = `/${action}/generate/conversation/${currentConversation.id}`;
    const actionName = action === 'notes' ? 'Note' : 'Quiz';
    try {
      await api.post(endpoint);
      alert(`${actionName} generation started! Check back in a moment.`);
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to generate ${action}`);
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
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className="chat-workspace">
      <section className="chat-history">
        <div className="chat-history-header">
          <h2 className="chat-history-title">Chat History</h2>
          <button onClick={handleNewConversation} className="chat-history-new" title="New conversation">
            <Plus size={20} />
          </button>
        </div>
        <div className="chat-history-list custom-scrollbar">
          {conversations.length === 0 ? (
            <p className="chat-history-empty">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setCurrentConversation(conv)}
                className={`chat-history-item${currentConversation?.id === conv.id ? ' chat-history-item--active' : ''}`}
              >
                <p className="chat-history-item-title">{conversationTitle(conv)}</p>
                <p className="chat-history-item-meta">{formatRelativeTime(conv.created_at)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="chat-center">
        {error && <div className="chat-error alert alert-error">{error}</div>}

        <div className="chat-context-bar">
          <div className="chat-context-left">
            <div className="chat-context-icon">
              <CloudUpload size={20} />
            </div>
            <div className="chat-context-info">
              <span className="chat-context-label">Context Source</span>
              <div className="chat-context-chips">
                {materials.map((m) => (
                  <span key={m.id} className="context-chip">
                    {m.title}
                    <button type="button" onClick={() => handleDeleteMaterial(m.id)} className="context-chip-remove">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".pdf,.docx,.pptx,.txt"
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="context-add-btn">
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

        <div className="chat-messages-area custom-scrollbar">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <Bot size={32} />
              </div>
              <p className="chat-empty-title">Ask your knowledge base</p>
              <p className="chat-empty-desc">Upload sources and ask questions to get started.</p>
            </div>
          ) : (
            <div className="chat-messages-inner">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="chat-msg chat-msg--user">
                    <div className="chat-msg-bubble chat-msg-bubble--user">
                      <p>{msg.content}</p>
                    </div>
                    <span className="chat-msg-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ) : (
                  <div key={msg.id} className="chat-msg chat-msg--assistant">
                    <div className="chat-msg-header">
                      <div className="chat-msg-avatar">
                        <Bot size={18} />
                      </div>
                      <span className="chat-msg-sender">Lumina AI</span>
                    </div>
                    <div className="chat-msg-bubble chat-msg-bubble--assistant">
                      <div className="chat-msg-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    <div className="chat-msg-actions">
                      <button type="button" className="chat-msg-action">
                        <ThumbsUp size={16} /> Helpful
                      </button>
                      <button type="button" className="chat-msg-action">
                        <ThumbsDown size={16} />
                      </button>
                      <button type="button" onClick={() => handleCopy(msg.content)} className="chat-msg-action">
                        <Copy size={16} /> Copy
                      </button>
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="chat-input-section">
          <form id="chat-form" onSubmit={handleSendQuery} className="chat-input-wrapper ai-gradient-border">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="chat-attach-btn">
              <Paperclip size={20} />
            </button>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onInput={handleTextareaInput}
              placeholder="Ask your knowledge base..."
              disabled={sending}
              rows={1}
              className="chat-textarea"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery(e);
                }
              }}
            />
            <button type="submit" disabled={sending || !query.trim()} className="chat-send-btn">
              <Send size={20} />
            </button>
          </form>
          <p className="chat-disclaimer">Lumina can make mistakes. Verify important info.</p>
        </div>
      </section>

      <section className="chat-actions-panel">
        <h3 className="chat-actions-title">Actions</h3>
        <div className="chat-actions-list">
          <button type="button" onClick={() => handleGenerateAction('notes')} className="action-card">
            <div className="action-card-left">
              <div className="action-card-icon action-card-icon--primary">
                <WandSparkles size={20} />
              </div>
              <div className="action-card-text">
                <span className="action-card-name">Generate Note</span>
                <span className="action-card-desc">Convert chat to markdown</span>
              </div>
            </div>
            <ChevronRight size={20} className="action-card-chevron" />
          </button>

          <button type="button" onClick={() => handleGenerateAction('quizzes')} className="action-card">
            <div className="action-card-left">
              <div className="action-card-icon action-card-icon--tertiary">
                <FileQuestion size={20} />
              </div>
              <div className="action-card-text">
                <span className="action-card-name">Create Quiz</span>
                <span className="action-card-desc">Test your knowledge</span>
              </div>
            </div>
            <ChevronRight size={20} className="action-card-chevron" />
          </button>

          <button type="button" onClick={handleSummarize} className="action-card">
            <div className="action-card-left">
              <div className="action-card-icon action-card-icon--secondary">
                <FileText size={20} />
              </div>
              <div className="action-card-text">
                <span className="action-card-name">Summarize Sources</span>
                <span className="action-card-desc">Key insights extraction</span>
              </div>
            </div>
            <ChevronRight size={20} className="action-card-chevron" />
          </button>

          <button type="button" onClick={() => setShowViewer('notes')} className="action-card action-card--subtle">
            <div className="action-card-left">
              <div className="action-card-icon action-card-icon--secondary">
                <File size={20} />
              </div>
              <div className="action-card-text">
                <span className="action-card-name">View Notes</span>
                <span className="action-card-desc">Browse generated notes</span>
              </div>
            </div>
            <ChevronRight size={20} className="action-card-chevron" />
          </button>

          <button type="button" onClick={() => setShowViewer('quizzes')} className="action-card action-card--subtle">
            <div className="action-card-left">
              <div className="action-card-icon action-card-icon--secondary">
                <ClipboardList size={20} />
              </div>
              <div className="action-card-text">
                <span className="action-card-name">View Quizzes</span>
                <span className="action-card-desc">Browse generated quizzes</span>
              </div>
            </div>
            <ChevronRight size={20} className="action-card-chevron" />
          </button>
        </div>

        <div className="workspace-health">
          <h4 className="workspace-health-title">Workspace Health</h4>
          <div className="workspace-health-bar">
            <div className="workspace-health-fill" style={{ width: `${Math.min((materials.length / 5) * 100, 100)}%` }} />
          </div>
          <p className="workspace-health-text">{materials.length} / 5 sources used</p>
        </div>
      </section>
    </div>
  );
}
