import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/users`);
        setUsers(res.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Members List</h1>
        <p>Manage health program members.</p>
      </div>

      <div className="glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Active Flow</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.phone_number}</td>
                <td>
                  {user.active_flow ? 
                    <span className="badge primary">{user.active_flow}</span> : 
                    <span className="badge" style={{background: 'var(--border-color)'}}>None</span>
                  }
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <Link to={`/users/${user.id}`} style={{color: 'var(--primary-color)', textDecoration: 'none'}}>View Context</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
