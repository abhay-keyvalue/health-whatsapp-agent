import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Activity, Users, AlertCircle, MessageSquare } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import UsersList from './pages/UsersList';
import UserChat from './pages/UserChat';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="logo">
            <Activity size={28} /> HealthSync
          </div>
          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Activity size={20} /> Overview
            </NavLink>
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} /> Members
            </NavLink>
            <NavLink to="/escalations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <AlertCircle size={20} /> Escalations
            </NavLink>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:id" element={<UserChat />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
