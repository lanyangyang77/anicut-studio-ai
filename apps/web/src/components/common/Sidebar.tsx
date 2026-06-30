import { NavLink } from 'react-router-dom';
import {
  Film,
  FolderOpen,
  Image,
  LayoutTemplate,
  LogOut,
  Music,
  User,
  Clapperboard,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Clapperboard },
  { to: '/media', label: '素材库', icon: Image },
  { to: '/templates', label: '模板库', icon: LayoutTemplate },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-surface-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Film className="w-6 h-6 text-neon-cyan" />
          <span className="text-lg font-bold text-white">
            AI Clip<span className="text-neon-cyan"> Studio</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ' +
              (isActive
                ? 'bg-surface-600 text-neon-cyan neon-glow'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700')
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center text-xs text-neon-cyan font-bold">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {user?.username || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-surface-700 rounded-lg transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}