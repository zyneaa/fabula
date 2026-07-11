import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
      if (res.data.length > 0) {
        setCurrentConversation(res.data[0]);
      }
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/chat/conversations/${conversationId}`);
      setMessages(res.data.messages);
    } catch (err) {
      setError('Failed to load messages');
    }
  };

  const handleNewConversation = async () => {
    try {
      const res = await api.post('/chat/conversations');
      const newConv = {
        id: res.data.id,
        created_at: res.data.created_at,
        message_count: 0,
      };
      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (err) {
      setError('Failed to create conversation');
    }
  };

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!query.trim() || !currentConversation) return;

    setSending(true);
    setError('');

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, userMessage]);
    setQuery('');

    try {
      const res = await api.post(`/chat/conversations/${currentConversation.id}/query`, {
        query: query,
      });
      
      // Add assistant message
      setMessages((prev) => [...prev, res.data]);
      
      // Update conversation message count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversation.id
            ? { ...conv, message_count: conv.message_count + 2 }
            : conv
        )
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send query');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px', display: 'flex', gap: '20px', height: 'calc(100vh - 150px)' }}>
      {/* Sidebar - Conversations List */}
      <div style={{ width: '300px', border: '1px solid #ddd', borderRadius: '5px', padding: '15px', backgroundColor: 'white', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Conversations</h3>
          <button
            onClick={handleNewConversation}
            style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            + New
          </button>
        </div>
        
        {conversations.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px' }}>No conversations yet. Start a new one!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setCurrentConversation(conv)}
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  backgroundColor: currentConversation?.id === conv.id ? '#e7f3ff' : 'white',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Chat #{conv.id}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {conv.message_count} messages
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                  {new Date(conv.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: 'white' }}>
        {error && <div style={{ color: 'red', padding: '10px', borderBottom: '1px solid #ddd' }}>{error}</div>}
        
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {!currentConversation ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              <p>Select a conversation or create a new one to start chatting</p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '50px' }}>
              <p>No messages yet. Ask a question about university information!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: msg.role === 'user' ? '#007bff' : '#f1f0f0',
                      color: msg.role === 'user' ? 'white' : 'black',
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.7 }}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentConversation && (
          <form onSubmit={handleSendQuery} style={{ padding: '15px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about university information..."
              disabled={sending}
              style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
            />
            <button
              type="submit"
              disabled={sending || !query.trim()}
              style={{
                padding: '10px 20px',
                cursor: sending ? 'not-allowed' : 'pointer',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                opacity: sending || !query.trim() ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
