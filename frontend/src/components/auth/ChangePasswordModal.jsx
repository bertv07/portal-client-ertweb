import { useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import api from '../../lib/axios';
import { apiError } from '../../lib/format';
import { Button, ErrorText, Field, Modal, inputClass } from '../ui';

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
      setError(apiError(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Modal title="Contraseña actualizada" onClose={onClose} size="sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <p className="text-sm text-gray-600 leading-relaxed">Usa tu nueva contraseña la próxima vez que inicies sesión.</p>
        </div>
        <Button className="w-full mt-6" onClick={onClose}>Listo</Button>
      </Modal>
    );
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Contraseña actual">
          <input type="password" required autoComplete="current-password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </Field>
        <Field label="Nueva contraseña" hint="Mínimo 6 caracteres.">
          <input type="password" required minLength={6} autoComplete="new-password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={submitting} className="mt-1"><KeyRound className="w-4 h-4" /> Cambiar contraseña</Button>
      </form>
    </Modal>
  );
}
