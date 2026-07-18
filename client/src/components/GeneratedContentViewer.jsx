import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';

export default function GeneratedContentViewer({ conversationId, type, onClose }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const endpoint = type === 'notes' ? '/notes' : '/quizzes';
        const { data } = await api.get(`${endpoint}/conversation/${conversationId}`);
        setContent(data);
      } catch {
        setContent([]);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [conversationId, type]);

  const title = `Generated ${type.charAt(0).toUpperCase() + type.slice(1)}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="w-[90%] max-w-[800px] h-[80%] bg-surface-container-lowest rounded-xl flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center flex-shrink-0">
          <h3 className="font-display text-xl font-semibold text-on-surface">{title}</h3>
          <button onClick={onClose} className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-mono text-xs font-medium border border-solid cursor-pointer transition-colors bg-secondary-container text-on-secondary-container border-outline hover:bg-surface-container-high w-auto">Close</button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-on-surface-variant">
              <div className="loading-spinner" />
              <span className="font-mono text-sm">Loading {type}...</span>
            </div>
          )}
          {!loading && content.length === 0 && <p className="text-on-surface-variant text-center py-16 font-mono text-sm">No {type} generated yet.</p>}

          {type === 'notes' && content.map(item => (
            <div key={item.id} className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
              <hr className="my-6 border-border-subtle" />
            </div>
          ))}

          {type === 'quizzes' && content.map((item, index) => (
            <div key={item.id}>
              <h4 className="font-display font-semibold text-lg mt-6 mb-4 text-on-surface">Quiz {index + 1}</h4>
              {item.questions.questions?.map((q, qIndex) => (
                <div key={qIndex} className="mb-5 p-4 bg-surface-container-low rounded-lg">
                  <p className="font-body text-sm font-semibold text-on-surface mb-3">{qIndex + 1}. {q.question}</p>
                  {q.options && (
                    <ul className="space-y-1.5 mb-3">
                      {q.options.map((o, i) => (
                        <li key={i} className="font-body text-sm text-on-surface-variant ml-4 list-disc">{o}</li>
                      ))}
                    </ul>
                  )}
                  <p className="font-mono text-xs text-on-surface-variant"><span className="text-primary font-semibold">Answer:</span> {q.correct_answer}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
