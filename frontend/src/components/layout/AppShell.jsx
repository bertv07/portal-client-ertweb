import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard, Users, FolderKanban, Wallet, FileText, Wrench, Bell, LogOut, Menu, X,
  CalendarCheck, MessageCircle, KanbanSquare, ReceiptText, KeyRound, ChevronDown, Home, Megaphone, SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';
import api from '../../lib/axios';
import { Avatar } from '../ui';
import { SPRING } from '../../lib/motion';
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
      { path: '/admin/automation', icon: SlidersHorizontal, label: 'Automatización', subtitle: 'Qué hace el bot por su cuenta' },
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

function NavList({ sections, badges, onNavigate, layoutId }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Principal">
      {sections.map((group) => (
        <div key={group.section} className="mb-6">
          {sections.length > 1 && <div className="text-xs font-semibold text-gray-500 px-3 mb-1.5">{group.section}</div>}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) => clsx(
                    'relative flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors duration-150 group',
                    isActive ? 'text-white font-semibold' : 'text-gray-700 font-medium hover:bg-brand-50 hover:text-brand-800',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {/* El fondo del ítem activo se desliza al que elijas */}
                      {isActive && <motion.span layoutId={layoutId} transition={SPRING.smooth} className="absolute inset-0 bg-brand-600 rounded-lg shadow-[0_1px_2px_rgb(36_16_48/0.3)]" />}
                      <item.icon className={clsx('relative w-[18px] h-[18px] shrink-0', isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-600')} strokeWidth={isActive ? 2.2 : 1.9} />
                      <span className="relative flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span className={clsx('relative text-[11px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center tabular-nums', isActive ? 'bg-white text-brand-700' : 'bg-brand-600 text-white')}>
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
        className="flex items-center gap-2.5 h-11 bg-white border border-brand-100/80 rounded-full pl-1.5 pr-3 hover:border-brand-300 transition-colors"
      >
        <Avatar name={user?.name} size="sm" tone="solid" />
        <span className="hidden sm:block text-left leading-tight max-w-[150px]">
          <span className="block text-xs font-bold text-gray-900 truncate">{user?.name}</span>
          <span className="block text-[11px] text-gray-500 truncate">{ROLE_LABELS[user?.role] || user?.role}</span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </button>
      <AnimatePresence>
      {open && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, scale: 0.94, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }} transition={SPRING.overlay}
          style={{ transformOrigin: 'top right' }}
          className="absolute right-0 mt-2 w-60 bg-white border border-brand-100 rounded-xl shadow-raised p-1.5 z-50"
        >
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <div className="text-xs font-bold text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); onChangePassword(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-brand-50">
            <KeyRound className="w-4 h-4 text-gray-500" /> Cambiar contraseña
          </button>
          <button role="menuitem" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </motion.div>
      )}
      </AnimatePresence>
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
    <div className="px-6 pt-6 pb-5">
      <img src={ertLogo} alt="ertweb" className="h-7 w-auto" />
      <div className="mt-1.5 text-xs text-gray-500 font-medium">
        {isClient ? 'Portal de clientes' : role === 'seller' ? 'Panel de ventas' : 'Panel de administración'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-white border-r border-brand-100/80">
        {brand}
        <NavList sections={sections} badges={badges} layoutId="nav-desktop" />
        <div className="p-3 border-t border-brand-100/70">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors">
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
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%', transition: { duration: 0.18 } }} transition={SPRING.overlay}
              className="fixed inset-y-0 left-0 w-[82%] max-w-xs bg-white z-[70] flex flex-col lg:hidden"
            >
              <div className="flex items-start justify-between pr-4">
                {brand}
                <button onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú" className="mt-6 p-2 rounded-xl text-gray-500 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList sections={sections} badges={badges} layoutId="nav-drawer" onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-brand-50/90 backdrop-blur-sm px-4 lg:px-10 pt-6 pb-5 flex items-center gap-3">
          {!isClient && (
            <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menú" className="lg:hidden h-11 w-11 flex items-center justify-center rounded-xl bg-white border border-brand-100/80 text-gray-700">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] lg:text-[26px] leading-tight font-extrabold text-gray-900 tracking-tight truncate">
              {isHome ? <><span className="sm:hidden">Hola, {firstName}</span><span className="max-sm:hidden">{greeting()}, {firstName}</span></> : current?.label || 'Portal'}
            </h1>
            <p className="text-[13px] text-gray-500 first-letter:uppercase truncate mt-0.5">{isHome ? today : current?.subtitle || today}</p>
          </div>
          {isClient && (
            <button
              onClick={() => navigate('/notifications')}
              aria-label="Notificaciones"
              className="relative h-11 w-11 flex items-center justify-center rounded-full bg-white border border-brand-100/80 text-gray-700 hover:text-brand-700 hover:border-brand-300 transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" />
              {badges.notifications > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
            </button>
          )}
          <UserMenu user={user} onChangePassword={() => setShowPassword(true)} onLogout={handleLogout} />
        </header>

        <main className={clsx('flex-1 w-full px-4 lg:px-10 pb-12 mx-auto max-w-[1440px]', isClient && 'pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10')}>
          <PageTransition />
        </main>

        {isClient && <div className="lg:hidden"><BottomNav /></div>}
      </div>

      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
}
