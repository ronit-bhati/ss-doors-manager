import logoImg from '../assets/logo.png';
import { NavLink } from 'react-router-dom';
import { Users, Settings } from 'lucide-react';

export function TopToolbar() {
  return (
    <header className="top-toolbar">
      <div className="top-toolbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <img
          src={logoImg}
          alt="SS Doors Logo"
          style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
        />
        <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.5px' }}>
          SS DOORS         </span>
      </div>

      <nav className="top-toolbar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `top-toolbar-link ${isActive ? 'active' : ''}`}
          end
        >
          <Users size={16} />
          <span>Clients</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `top-toolbar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="top-toolbar-status">
        Offline Mode
      </div>
    </header>
  );
}
