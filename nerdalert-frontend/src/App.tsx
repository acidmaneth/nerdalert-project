import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import nerdalertAvatar from '/nerdalert.png';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  image?: string;
  source?: string;
}

function stripThinking(text: string): string {
  // Remove <think>...</think> and any whitespace around it
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function ThinkingDots() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 4), 400);
    return () => clearInterval(interval);
  }, []);
  return <span className="thinking-dots">{'.'.repeat(step)}</span>;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // On mount, have agent initiate chat
  useEffect(() => {
    if (messages.length === 0) {
      setLoading(true);
      fetch('/prompt-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      })
        .then((res) => res.json())
        .then((data) => {
          const cleanText = data.text ? stripThinking(data.text) : (data.error || 'No response received');
          setMessages([{ sender: 'agent', text: cleanText, image: data.image, source: data.source }]);
        })
        .catch(() => {
          setMessages([{ sender: 'agent', text: 'Error: Could not reach backend.' }]);
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line
  }, []);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Message = { sender: 'user', text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      // Call backend API using the sync endpoint
      const res = await fetch('/prompt-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(({ sender, text }) => ({
              role: sender === 'user' ? 'user' : 'assistant',
              content: text,
            })),
            { role: 'user', content: input },
          ],
        }),
      });
      const data = await res.json();
      // Filter out <think>...</think> from agent response
      const cleanText = data.text ? stripThinking(data.text) : (data.error || 'No response received');
      const agentMsg: Message = {
        sender: 'agent',
        text: cleanText,
        image: data.image,
        source: data.source,
      };
      setMessages((msgs) => [...msgs, agentMsg]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { sender: 'agent', text: 'Error: Could not reach backend.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="matrix-root">
      <header className="matrix-header">
        <img src={nerdalertAvatar} alt="NerdAlert avatar" className="matrix-avatar" />
        <div className="matrix-title">
          <h1>NerdAlert</h1>
          <p className="matrix-catchphrase">Beep boop – Nerd detected! ALERT! ALERT!</p>
        </div>
      </header>
      <main className="matrix-chat-container">
        <div className="matrix-chat-window">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={
                msg.sender === 'user' ? 'matrix-msg-user' : 'matrix-msg-agent'
              }
            >
              {msg.sender === 'agent' && (
                <img
                  src={nerdalertAvatar}
                  alt="Agent"
                  className="matrix-msg-avatar"
                />
              )}
              <span>{msg.text}</span>
            </div>
          ))}
          {/* Show thinking animation if loading */}
          {loading && (
            <div className="matrix-msg-agent">
              <span className="thinking-dots-chat"><ThinkingDots /></span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Image and source credit area */}
        {messages.length > 0 && messages[messages.length - 1].image && (
          <div className="matrix-image-area">
            <img
              src={messages[messages.length - 1].image}
              alt="Web result"
              className="matrix-web-image"
              style={{ maxWidth: '100%', maxHeight: '200px' }}
            />
            {messages[messages.length - 1].source && (
              <div className="matrix-image-credit">
                Source:{' '}
                <a
                  href={messages[messages.length - 1].source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {messages[messages.length - 1].source}
                </a>
              </div>
            )}
          </div>
        )}
        <form className="matrix-input-row" onSubmit={sendMessage}>
          <input
            className="matrix-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={loading}
            autoFocus
          />
          <button className="matrix-send-btn" type="submit" disabled={loading}>
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
