import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Users as UsersIcon, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const [escalations, setEscalations] = useState([]);
  const [stats, setStats] = useState({ users: 150, msgs: 3420, alerts: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [escRes, usersRes] = await Promise.all([
          axios.get('http://localhost:3000/api/escalations'),
          axios.get('http://localhost:3000/api/users')
        ]);
        setEscalations(escRes.data);
        setStats(prev => ({ 
          ...prev, 
          users: usersRes.data.length,
          alerts: escRes.data.filter(e => e.status === 'pending').length 
        }));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Overview</h1>
        <p>Monitor your health agent operations and clinical escalations.</p>
      </div>

      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon"><UsersIcon size={24} /></div>
          <div className="stat-info">
            <h3>Total Members</h3>
            <p>{stats.users}</p>
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-icon"><MessageCircle size={24} /></div>
          <div className="stat-info">
            <h3>Weekly Messages</h3>
            <p>{stats.msgs}</p>
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-icon" style={{color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.1)'}}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <h3>Active Escalations</h3>
            <p>{stats.alerts}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <h2 style={{ marginBottom: '1rem' }}>Recent Escalations <span className="badge danger">Requires Action</span></h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Trigger Reason</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {escalations.map(esc => (
              <tr key={esc.id}>
                <td>
                  <strong>{esc.name}</strong><br/>
                  <span style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>{esc.phone_number}</span>
                </td>
                <td>{esc.reason}</td>
                <td>{new Date(esc.created_at).toLocaleString()}</td>
                <td>
                  <span className={`badge ${esc.status === 'pending' ? 'danger' : 'success'}`}>
                    {esc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
