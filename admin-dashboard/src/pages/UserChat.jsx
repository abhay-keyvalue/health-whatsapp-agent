import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';

export default function UserChat() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/users/${id}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    fetchMessages();
  }, [id]);

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
              <strong>{msg.sender === 'agent' ? 'Health Agent' : 'Member'}</strong><br/>
              {msg.body}
              <div style={{fontSize: '0.7rem', opacity: 0.7, marginTop: '0.25rem'}}>
                  {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
