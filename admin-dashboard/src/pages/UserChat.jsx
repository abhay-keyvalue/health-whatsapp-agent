import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Video, X } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function UserChat() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const fileInputRef = useRef(null);

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
    if ((!newMessage.trim() && !selectedVideo) || sending) return;

    setSending(true);
    try {
      if (selectedVideo) {
        // Send video
        const formData = new FormData();
        formData.append('video', selectedVideo);
        if (newMessage.trim()) {
          formData.append('caption', newMessage.trim());
        }
        
        await axios.post(`${API_BASE_URL}/api/users/${id}/video`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Send text message
        await axios.post(`${API_BASE_URL}/api/users/${id}/messages`, {
          message: newMessage.trim()
        });
      }
      
      setNewMessage('');
      setSelectedVideo(null);
      setVideoPreview(null);
      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 16MB for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        alert('Video file must be smaller than 16MB');
        return;
      }
      
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              
              {/* Render media if present */}
              {msg.media_url && msg.media_type && (
                <div style={{marginTop: '0.5rem', marginBottom: '0.5rem'}}>
                  {msg.media_type === 'video' && (
                    <video 
                      src={API_BASE_URL + msg.media_url} 
                      controls
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '8px',
                        backgroundColor: '#000'
                      }}
                    />
                  )}
                  {msg.media_type === 'image' && (
                    <img 
                      src={API_BASE_URL + msg.media_url} 
                      alt="Shared image"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '8px',
                        objectFit: 'contain'
                      }}
                    />
                  )}
                  {msg.media_type === 'audio' && (
                    <audio 
                      src={API_BASE_URL + msg.media_url} 
                      controls
                      style={{
                        maxWidth: '100%'
                      }}
                    />
                  )}
                  {msg.media_type === 'voice' && (
                    <audio 
                      src={API_BASE_URL + msg.media_url} 
                      controls
                      style={{
                        maxWidth: '100%'
                      }}
                    />
                  )}
                  {(msg.media_type === 'document' || msg.media_type === 'sticker') && (
                    <a 
                      href={API_BASE_URL + msg.media_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--primary-color)',
                        textDecoration: 'underline'
                      }}
                    >
                      Download {msg.media_type}
                    </a>
                  )}
                </div>
              )}
              
              {/* Render text body */}
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
          borderTop: '1px solid var(--border-color)'
        }}>
          {/* Video Preview */}
          {videoPreview && (
            <div style={{
              marginBottom: '1rem',
              position: 'relative',
              display: 'inline-block',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '0.5rem'
            }}>
              <video 
                src={videoPreview} 
                style={{
                  maxWidth: '200px',
                  maxHeight: '150px',
                  borderRadius: '4px'
                }}
                controls
              />
              <button
                type="button"
                onClick={handleRemoveVideo}
                style={{
                  position: 'absolute',
                  top: '0.25rem',
                  right: '0.25rem',
                  background: 'rgba(255,0,0,0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
              <div style={{fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)'}}>
                {selectedVideo.name}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleVideoSelect}
              accept="video/mp4,video/mov,video/avi,video/3gp,video/mkv"
              style={{ display: 'none' }}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              style={{
                padding: '0.75rem',
                background: 'var(--border-color)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: '8px',
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Attach video"
            >
              <Video size={20} />
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedVideo ? "Add caption (optional)..." : "Type your message..."}
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
              disabled={sending || (!newMessage.trim() && !selectedVideo)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: sending || (!newMessage.trim() && !selectedVideo) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: sending || (!newMessage.trim() && !selectedVideo) ? 0.5 : 1
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
