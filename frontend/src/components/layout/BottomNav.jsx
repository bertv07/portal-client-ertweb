import { Home, FolderOpen, Wallet, Calendar, Wrench } from 'lucide-react';
import { NavLink } from 'react-router';
import clsx from 'clsx';

const NAV_ITEMS = [
  { path: '/documents', icon: FolderOpen, label: 'Documentos' },
  { path: '/schedule', icon: Calendar, label: 'Agenda' },
  { path: '/dashboard', icon: Home, label: 'Inicio' },
  { path: '/billing', icon: Wallet, label: 'Pagos' },
  { path: '/maintenance', icon: Wrench, label: 'Mantenimiento' },
];

export default function BottomNav() {
  return (
    <nav className="tabbar2 fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <ul className="tabbar2-list flex h-16">
        {NAV_ITEMS.map((item) => (
          <li key={item.path} className="tabbar2-item">
            <NavLink
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) => clsx('tabbar2-link', isActive && 'is-active')}
            >
              <item.icon className="tabbar2-icon" />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
