import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';

export default function GeneratedContentViewer({ conversationId, type, onClose }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError('');
      try {
        const endpoint = type === 'notes' ? '/notes' : '/quizzes';
        const { data } = await api.get(`${endpoint}/conversation/${conversationId}`);
        setContent(data);
      } catch (err) {
        setError(`Failed to load ${type}.`);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [conversationId, type]);

  const title = `Generated ${type.charAt(0).toUpperCase() + type.slice(1)}`;

  return (
    <div className="generated-content-viewer" onClick={onClose}>
      <div className="generated-content-modal" onClick={(e) => e.stopPropagation()}>
        <div className="generated-content-header">
          <h3 className="page-title" style={{ fontSize: '24px' }}>{title}</h3>
          <button onClick={onClose} className="btn btn-secondary" style={{width: 'auto'}}>Close</button>
        </div>
        <div className="generated-content-body">
          {loading && <p>Loading...</p>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && content.length === 0 && <p>No {type} have been generated for this conversation yet.</p>}
          
          {type === 'notes' && content.map(item => (
            <div key={item.id} className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
              <hr />
            </div>
          ))}

          {type === 'quizzes' && content.map((item, index) => (
            <div key={item.id}>
              <h4>Quiz {index + 1}</h4>
              {item.questions.questions?.map((q, qIndex) => (
                <div key={qIndex} style={{marginBottom: '1rem'}}>
                  <p><strong>{qIndex + 1}. {q.question}</strong></p>
                  {q.options && <ul>{q.options.map((o, i) => <li key={i}>{o}</li>)}</ul>}
                  <p><em>Answer: {q.correct_answer}</em></p>
                </div>
              ))}
              <hr />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
