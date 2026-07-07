import { useState } from 'react';
import { X, CheckCircle2, KeyRound } from 'lucide-react';
import api from '../../lib/axios';

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cambiar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="float-right p-1.5 rounded-xl hover:bg-gray-50 text-gray-400 mb-2">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900 mb-1 clear-both">Cambiar Contraseña</h3>

        {success ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">Contraseña Actualizada</h4>
            <p className="text-xs text-gray-500 mb-4">
              Usa tu nueva contraseña la próxima vez que inicies sesión.
            </p>
            <button
              onClick={onClose}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-8 rounded-2xl text-sm transition-colors"
            >
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-gray-500">
              Ingresa la contraseña con la que entras actualmente y la nueva que quieres usar.
            </p>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Contraseña Actual</label>
              <input
                type="password"
                required
                placeholder="La contraseña que usas hoy"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-400"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-400"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-2xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
