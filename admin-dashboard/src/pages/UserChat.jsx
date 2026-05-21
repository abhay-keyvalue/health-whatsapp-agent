import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function UserChat() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [id]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/users/${id}/messages`, {
        message: newMessage.trim()
      });
      setNewMessage('');
      await fetchMessages(); // Refresh messages
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="dashboard-header" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        <Link to="/users" style={{color: 'var(--text-muted)'}}><ArrowLeft /></Link>
        <div>
            <h1 style={{fontSize: '1.5rem'}}>Conversation Context</h1>
            <p>Member #{id}</p>
        </div>
      </div>

      <div className="glass-panel chat-window">
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message-bubble ${msg.sender}`}>
              <strong>{msg.sender === 'agent' ? 'Health Agent' : msg.sender === 'admin' ? 'Admin' : 'Member'}</strong><br/>
              {msg.body}
              <div style={{fontSize: '0.7rem', opacity: 0.7, marginTop: '0.25rem'}}>
                  {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSendMessage} style={{
          marginTop: '1rem',
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: sending || !newMessage.trim() ? 0.5 : 1
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
