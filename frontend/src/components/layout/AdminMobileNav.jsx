import { NavLink, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard, Users, FolderOpen, Wallet, Wrench, Bell, LogOut, X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/clients', icon: Users, label: 'Clientes' },
  { path: '/admin/projects', icon: FolderOpen, label: 'Proyectos' },
  { path: '/admin/invoices', icon: Wallet, label: 'Facturación' },
  { path: '/admin/documents', icon: FolderOpen, label: 'Documentos' },
  { path: '/admin/maintenance', icon: Wrench, label: 'Mantenimiento' },
  { path: '/admin/payments', icon: Wallet, label: 'Pagos Manuales' },
  { path: '/admin/notifications', icon: Bell, label: 'Notificaciones' },
];

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function AdminMobileNav({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — igual que .burger-overlay de ertweb.com */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[60] lg:hidden"
          />

          {/* Panel — desliza desde la derecha, igual que .burger-content */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="fixed top-0 right-0 bottom-0 w-[80%] max-w-xs bg-[#0d0d0d] z-[70] flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between px-5 py-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <span className="text-white font-black text-sm">E</span>
                </div>
                <div>
                  <div className="font-bold text-white text-sm leading-tight">ErtWeb</div>
                  <div className="text-[10px] text-brand-400 font-medium">Panel Admin</div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar menú"
                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <nav className="flex-1 px-3 py-2 overflow-y-auto">
              <div className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={clsx('w-4.5 h-4.5 shrink-0', isActive ? 'text-white' : 'text-gray-500')} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </nav>

            <div className="px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0" />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
