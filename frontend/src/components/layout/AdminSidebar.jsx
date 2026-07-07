import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, FolderOpen, Wallet, Wrench, Bell, LogOut,
  ChevronRight, Settings, CalendarCheck
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import ertLogoWhite from '../../assets/ert-logo-white.png';

const navItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/clients', icon: Users, label: 'Clientes' },
  { path: '/admin/projects', icon: FolderOpen, label: 'Proyectos' },
  { path: '/admin/invoices', icon: Wallet, label: 'Facturación' },
  { path: '/admin/documents', icon: FolderOpen, label: 'Documentos' },
  { path: '/admin/maintenance', icon: Wrench, label: 'Mantenimiento' },
  { path: '/admin/payments', icon: Wallet, label: 'Pagos Manuales' },
  { path: '/admin/appointments', icon: CalendarCheck, label: 'Citas' },
  { path: '/admin/notifications', icon: Bell, label: 'Notificaciones' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gray-950 fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/5">
        <img src={ertLogoWhite} alt="ertweb" className="h-7 w-auto" />
        <div className="mt-2 text-[10px] text-brand-400 font-medium tracking-wide">Panel Admin</div>
      </div>

      {/* Admin info */}
      <div className="px-4 py-3 mx-3 mt-4 mb-3 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white shrink-0">
            <span className="text-sm font-bold">{user?.name?.[0] || 'A'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm truncate">{user?.name}</div>
            <div className="text-[11px] text-gray-400 truncate">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold tracking-widest text-gray-600 px-3 mb-3">Navegación</div>
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={clsx('w-4.5 h-4.5 shrink-0', isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-400')} />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <div className="border-t border-white/5 pt-4 mb-2">
          <div className="text-[10px] uppercase font-bold tracking-widest text-gray-600 px-3 mb-2">Sistema</div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors group"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
