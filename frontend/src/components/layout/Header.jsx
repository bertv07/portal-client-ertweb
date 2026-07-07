import { useState } from 'react';
import { Bell, User, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router';
import ChangePasswordModal from '../auth/ChangePasswordModal';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between gap-2 px-6 pt-10 pb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 shrink-0 rounded-full bg-white flex items-center justify-center text-brand-600 shadow-sm">
          <User className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1 leading-tight min-w-0">
            <span className="text-gray-700 shrink-0">Hola,</span>
            <span className="font-bold text-gray-900 text-lg truncate">{user?.name?.split(' ')[0] || 'Invitado'}</span>
          </div>
          <span className="text-xs text-brand-700 mt-0.5 truncate">{user?.email || 'cargando...'}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-brand-800 bg-white/30 hover:bg-white/50 rounded-full transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-brand-100"></span>
        </button>

        <button
          onClick={() => setShowChangePassword(true)}
          className="relative p-2 text-brand-800 bg-white/30 hover:bg-white/50 rounded-full transition-colors"
          title="Cambiar contraseña"
        >
          <KeyRound className="w-5 h-5" />
        </button>

        <button
          onClick={handleLogout}
          className="relative p-2 text-red-500 bg-white/30 hover:bg-white/50 rounded-full transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </header>
  );
}
