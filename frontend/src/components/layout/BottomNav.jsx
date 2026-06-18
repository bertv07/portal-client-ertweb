import { Home, FolderOpen, Wallet, Calendar, Settings } from 'lucide-react';
import { NavLink } from 'react-router';
import clsx from 'clsx';

export default function BottomNav() {
  const navItems = [
    { path: '/documents', icon: FolderOpen },
    { path: '/schedule', icon: Calendar },
    { path: '/dashboard', icon: Home, isMain: true },
    { path: '/billing', icon: Wallet },
    { path: '/maintenance', icon: Settings },
  ];

  return (
    <nav className="absolute bottom-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-6 py-4 flex justify-between items-center z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => clsx(
            "flex items-center justify-center transition-all duration-300",
            item.isMain 
              ? "w-14 h-14 -mt-8 rounded-full shadow-lg border-4 border-white"
              : "w-10 h-10 rounded-xl",
            isActive && item.isMain ? "bg-brand-700 text-white shadow-brand-500/30" : "",
            !isActive && item.isMain ? "bg-brand-600 text-white hover:bg-brand-700" : "",
            isActive && !item.isMain ? "bg-brand-100 text-brand-700" : "",
            !isActive && !item.isMain ? "text-gray-400 hover:text-brand-500 hover:bg-brand-50" : ""
          )}
        >
          <item.icon className={clsx(
            item.isMain ? "w-6 h-6" : "w-5 h-5"
          )} />
        </NavLink>
      ))}
    </nav>
  );
}
