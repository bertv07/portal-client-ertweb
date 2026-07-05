import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Bell, Send } from 'lucide-react';
import api from '../../lib/axios';

function SendNotificationModal({ clients, onClose }) {
  const [form, setForm] = useState({
    client_id: 'all', title: '', message: '', type: 'update',
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const sendToOne = (clientId) =>
    api.post('/notifications/send', { user_id: clientId, ...form });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form.client_id === 'all') {
        await Promise.all(clients.map(c => sendToOne(c.id)));
      } else {
        await sendToOne(form.client_id);
      }
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Enviar Notificación</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {sent ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-green-700 font-semibold">¡Notificación enviada!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Destinatario</label>
              <select required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="all">Todos los clientes</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {['update', 'milestone', 'document', 'support'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Título</label>
              <input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Mensaje</label>
              <textarea required rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none"
                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Cancelar</button>
              <button type="submit" className="flex-1 bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm">
                Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminNotifications() {
  const [showModal, setShowModal] = useState(false);
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {showModal && <SendNotificationModal clients={clients} onClose={() => setShowModal(false)} />}

      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" /> Nueva notificación
        </button>
      </div>

      <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
        <Bell className="w-12 h-12 mx-auto mb-3 text-brand-300" />
        <h3 className="font-bold text-gray-800 mb-1">Centro de Notificaciones</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Envía notificaciones manuales a tus clientes sobre hitos, documentos, actualizaciones de proyecto y más.
        </p>
        <button onClick={() => setShowModal(true)}
          className="mt-6 bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-brand-700 transition-colors">
          Enviar notificación
        </button>
      </div>
    </div>
  );
}
