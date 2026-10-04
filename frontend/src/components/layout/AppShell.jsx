import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard, Users, FolderKanban, Wallet, FileText, Wrench, Bell, LogOut, Menu, X,
  CalendarCheck, MessageCircle, KanbanSquare, ReceiptText, KeyRound, ChevronDown, Home, Megaphone,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';
import api from '../../lib/axios';
import { Avatar } from '../ui';
import PageTransition from './PageTransition';
import BottomNav from './BottomNav';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import ertLogo from '../../assets/ert-logo.png';

const NAV = {
  admin: [
    { section: 'General', items: [
      { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', subtitle: 'Resumen general de la agencia' },
      { path: '/admin/users', icon: Users, label: 'Cuentas', subtitle: 'Clientes, vendedores y administradores' },
      { path: '/admin/projects', icon: FolderKanban, label: 'Proyectos', subtitle: 'Todos los proyectos activos e históricos' },
    ] },
    { section: 'Ventas', items: [
      { path: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp', subtitle: 'Chats, IA y respuestas', badge: 'wa' },
      { path: '/admin/pipeline', icon: KanbanSquare, label: 'Pipeline', subtitle: 'Leads por etapa de venta' },
      { path: '/admin/appointments', icon: CalendarCheck, label: 'Agenda', subtitle: 'Citas con clientes y leads' },
    ] },
    { section: 'Finanzas', items: [
      { path: '/admin/invoices', icon: ReceiptText, label: 'Facturación', subtitle: 'Facturas y recibos' },
      { path: '/admin/payments', icon: Wallet, label: 'Pagos', subtitle: 'Comprobantes de pagos manuales', badge: 'payments' },
      { path: '/admin/maintenance', icon: Wrench, label: 'Mantenimiento', subtitle: 'Planes de mantenimiento' },
    ] },
    { section: 'Clientes', items: [
      { path: '/admin/documents', icon: FileText, label: 'Documentos', subtitle: 'Archivos de los clientes' },
      { path: '/admin/notifications', icon: Megaphone, label: 'Avisos', subtitle: 'Enviar notificaciones a clientes' },
    ] },
  ],
  seller: [
    { section: 'Ventas', items: [
      { path: '/seller/dashboard', icon: LayoutDashboard, label: 'Inicio', subtitle: 'Tu día de ventas' },
      { path: '/seller/whatsapp', icon: MessageCircle, label: 'WhatsApp', subtitle: 'Chats, IA y respuestas', badge: 'wa' },
      { path: '/seller/pipeline', icon: KanbanSquare, label: 'Pipeline', subtitle: 'Leads por etapa de venta' },
      { path: '/seller/agenda', icon: CalendarCheck, label: 'Agenda', subtitle: 'Citas con clientes y leads' },
    ] },
  ],
  client: [
    { section: 'Mi portal', items: [
      { path: '/dashboard', icon: Home, label: 'Inicio', subtitle: 'El avance de tu proyecto' },
      { path: '/documents', icon: FileText, label: 'Documentos', subtitle: 'Tus archivos y requisitos' },
      { path: '/billing', icon: Wallet, label: 'Facturación', subtitle: 'Facturas y pagos' },
      { path: '/schedule', icon: CalendarCheck, label: 'Agenda', subtitle: 'Reuniones con el equipo' },
      { path: '/maintenance', icon: Wrench, label: 'Mantenimiento', subtitle: 'Tu plan de soporte' },
      { path: '/notifications', icon: Bell, label: 'Notificaciones', subtitle: 'Novedades de tu proyecto', badge: 'notifications' },
    ] },
  ],
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};

function useBadges(role) {
  const isStaff = role === 'admin' || role === 'seller';
  const { data: convs = [] } = useQuery({
    queryKey: ['wa-conversations', ''],
    queryFn: () => api.get('/whatsapp/conversations').then((r) => r.data),
    enabled: isStaff,
    refetchInterval: 15000,
  });
  const { data: pending = [] } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: () => api.get('/manual-payments/pending').then((r) => r.data),
    enabled: role === 'admin',
    refetchInterval: 60000,
  });
  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.unread),
    enabled: role === 'client',
    refetchInterval: 60000,
  });
  return {
    wa: convs.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    payments: pending.length,
    notifications: unread || 0,
  };
}

function NavList({ sections, badges, onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {sections.map((group) => (
        <div key={group.section} className="mb-5">
          <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 px-3 mb-2">{group.section}</div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors group',
                    isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-800',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={clsx('w-[18px] h-[18px] shrink-0', isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-600')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span className={clsx('text-[10px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center', isActive ? 'bg-white text-brand-700' : 'bg-brand-600 text-white')}>
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ user, onChangePassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 bg-white border border-brand-100/70 rounded-full pl-1.5 pr-3 py-1.5 hover:border-brand-300 transition-colors"
      >
        <Avatar name={user?.name} size="sm" tone="solid" />
        <span className="hidden sm:block text-left leading-tight max-w-[150px]">
          <span className="block text-xs font-bold text-gray-900 truncate">{user?.name}</span>
          <span className="block text-[10px] text-gray-500 truncate">{ROLE_LABELS[user?.role] || user?.role}</span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 bg-white border border-brand-100 rounded-2xl shadow-xl shadow-brand-900/10 p-1.5 z-50">
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <div className="text-xs font-bold text-gray-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); onChangePassword(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-brand-50">
            <KeyRound className="w-4 h-4 text-gray-400" /> Cambiar contraseña
          </button>
          <button role="menuitem" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const role = user?.role;
  const isClient = role === 'client';
  const sections = NAV[role] || NAV.client;
  const badges = useBadges(role);

  const current = sections.flatMap((g) => g.items).find((i) => pathname.startsWith(i.path));
  const isHome = current && current === sections[0].items[0];
  const firstName = user?.name?.split(' ')[0] || '';
  const today = new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const brand = (
    <div className="px-6 pt-7 pb-5">
      <img src={ertLogo} alt="ertweb" className="h-7 w-auto" />
      <div className="mt-2 text-[10px] text-brand-600 font-semibold tracking-wide uppercase">
        {isClient ? 'Portal de clientes' : role === 'seller' ? 'Panel de ventas' : 'Panel admin'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-white border-r border-brand-100/70">
        {brand}
        <NavList sections={sections} badges={badges} />
        <div className="p-3 border-t border-brand-100/70">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-[18px] h-[18px]" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Drawer — móvil (admin y vendedor; el cliente usa la barra inferior) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-brand-950/50 z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 w-[82%] max-w-xs bg-white z-[70] flex flex-col lg:hidden"
            >
              <div className="flex items-start justify-between pr-4">
                {brand}
                <button onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú" className="mt-6 p-2 rounded-xl text-gray-400 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList sections={sections} badges={badges} onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-brand-50/85 backdrop-blur-md px-4 lg:px-8 py-4 flex items-center gap-3">
          {!isClient && (
            <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menú" className="lg:hidden p-2.5 rounded-2xl bg-white border border-brand-100/70 text-gray-600">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-gray-500 first-letter:uppercase truncate">{isHome ? today : current?.subtitle || today}</div>
            <h1 className="text-xl lg:text-2xl font-extrabold text-gray-900 tracking-tight truncate">
              {isHome ? `${greeting()}, ${firstName}` : current?.label || 'Portal'}
            </h1>
          </div>
          {isClient && (
            <button
              onClick={() => navigate('/notifications')}
              aria-label="Notificaciones"
              className="relative p-2.5 rounded-full bg-white border border-brand-100/70 text-gray-600 hover:text-brand-700 hover:border-brand-300 transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" />
              {badges.notifications > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
            </button>
          )}
          <UserMenu user={user} onChangePassword={() => setShowPassword(true)} onLogout={handleLogout} />
        </header>

        <main className={clsx('flex-1 w-full px-4 lg:px-8 pb-10 mx-auto max-w-[1400px]', isClient && 'pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10')}>
          <PageTransition />
        </main>

        {isClient && <div className="lg:hidden"><BottomNav /></div>}
      </div>

      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
}
