import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  Cross,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';
import { authService, type UserRole } from '../services/auth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const USER_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Exams', path: '/dashboard/exams', icon: <ClipboardList size={20} /> },
  { label: 'Calendar', path: '/dashboard/calendar', icon: <Calendar size={20} /> },
  { label: 'Patients', path: '/dashboard/patients', icon: <Users size={20} /> },
  { label: 'Reports', path: '/dashboard/reports', icon: <FileText size={20} /> },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'User Management', path: '/admin/dashboard/users', icon: <Users size={20} /> },
  { label: 'Doctors', path: '/admin/dashboard/doctors', icon: <Stethoscope size={20} /> },
  { label: 'System Settings', path: '/admin/dashboard/settings', icon: <Settings size={20} /> },
  { label: 'Audit Logs', path: '/admin/dashboard/logs', icon: <ScrollText size={20} /> },
];

interface SidebarProps {
  role: UserRole;
  username: string;
  fullName?: string | null;
}

export function Sidebar({ role, username, fullName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const navItems = role === 'admin' ? ADMIN_NAV : USER_NAV;

  const handleLogout = () => {
    if (role === 'admin') {
      authService.logoutAdmin();
      navigate('/admin');
    } else {
      authService.logoutUser();
      navigate('/login');
    }
  };

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 shrink-0"
      style={{
        width: collapsed ? '72px' : '240px',
        background: 'linear-gradient(180deg, #0f2d4f 0%, #1a4a7a 60%, #0d7377 100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)' }}
            >
              <Cross size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold text-sm tracking-wide">AIOC</p>
              <p className="text-white/60 text-xs">Hospital</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="flex items-center justify-center rounded-lg mx-auto"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)' }}
          >
            <Cross size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-white/70 hover:text-white transition-colors ml-auto"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-white/10">
          <div
            className="flex items-center justify-center rounded-full text-white font-bold text-lg mb-2 mx-auto"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)' }}
          >
            {(fullName ?? username).charAt(0).toUpperCase()}
          </div>
          <p className="text-white text-sm font-semibold text-center truncate">
            {fullName ?? username}
          </p>
          <p className="text-white/50 text-xs text-center capitalize">{role}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard' || item.path === '/admin/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
               ${isActive
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
              }
               ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
