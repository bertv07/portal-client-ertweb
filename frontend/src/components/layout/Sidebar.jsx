import { NavLink, useNavigate } from 'react-router';
import { Home, FolderOpen, Wallet, Calendar, Settings, Bell, LogOut, User, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import ertLogo from '../../assets/ert-logo.png';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/documents', icon: FolderOpen, label: 'Documentos' },
  { path: '/billing', icon: Wallet, label: 'Facturación' },
  { path: '/schedule', icon: Calendar, label: 'Agenda' },
  { path: '/maintenance', icon: Settings, label: 'Mantenimiento' },
  { path: '/notifications', icon: Bell, label: 'Notificaciones' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0 bottom-0 z-40 shadow-sm">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-gray-50">
        <img src={ertLogo} alt="ertweb" className="h-7 w-auto" />
        <div className="mt-2 text-[10px] text-brand-600 font-medium tracking-wide">Portal de Clientes</div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 mx-3 mt-4 mb-2 bg-brand-50 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{user?.name || 'Cliente'}</div>
            <div className="text-[11px] text-brand-700 truncate">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 px-3 mb-3">Menú</div>
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={clsx('w-4.5 h-4.5 shrink-0', isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-600')} />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors group"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
