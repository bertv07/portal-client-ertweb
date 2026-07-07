import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search, Edit2, Trash2, CalendarCheck, Clock, Link2, ExternalLink } from 'lucide-react';
import api from '../../lib/axios';

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-amber-100 text-amber-700',
};

const STATUS_LABELS = {
  scheduled: 'Agendada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const SOURCE_COLORS = {
  client: 'bg-purple-100 text-purple-700',
  admin: 'bg-brand-100 text-brand-700',
  n8n: 'bg-cyan-100 text-cyan-700',
};

const SOURCE_LABELS = {
  client: 'Cliente',
  admin: 'Admin',
  n8n: 'n8n',
};

function AppointmentFormModal({ appointment, clients, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(appointment ? {
    client_id: appointment.client_id,
    title: appointment.title,
    description: appointment.description || '',
    appointment_date: appointment.appointment_date?.split('T')[0] || '',
    time_slot: appointment.time_slot,
    duration_minutes: appointment.duration_minutes || 30,
    status: appointment.status,
    meeting_link: appointment.meeting_link || '',
    notes: appointment.notes || '',
  } : {
    client_id: '', title: '', description: '',
    appointment_date: '', time_slot: '09:00 AM',
    duration_minutes: 30, status: 'scheduled',
    meeting_link: '', notes: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => appointment
      ? api.put(`/appointments/${appointment.id}`, data)
      : api.post('/appointments/', data),
    onSuccess: () => { qc.invalidateQueries(['admin-appointments']); onClose(); },
    onError: (e) => setError(e.response?.data?.detail || 'Error al guardar'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, duration_minutes: Number(form.duration_minutes) };
    mutation.mutate(data);
  };

  const timeSlots = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM',
  ];

  const field = (label, key, type = 'text', extraProps = {}) => (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
      <input type={type} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
        value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} {...extraProps} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-brand-600" />
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Client selector */}
          {!appointment && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
              <select required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
          )}

          {field('Asunto / Tema', 'title', 'text', { required: true })}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Descripción</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none"
              rows={2} placeholder="Notas adicionales sobre la cita..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Fecha', 'appointment_date', 'date', { required: true })}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Hora</label>
              <select required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.time_slot} onChange={e => setForm(p => ({ ...p, time_slot: e.target.value }))}>
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Duración (min)</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}>
                {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Estado</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {field('Link de reunión (Meet/Zoom)', 'meeting_link', 'url')}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Notas del admin</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 resize-none"
              rows={2} placeholder="Notas internas..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {mutation.isPending ? 'Guardando...' : appointment ? 'Guardar cambios' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminAppointments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | appointment object

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['admin-appointments'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries(['admin-appointments']),
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const filtered = appointments.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (clientMap[a.client_id]?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.time_slot || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {modal !== null && (
        <AppointmentFormModal
          appointment={modal === 'create' ? null : modal}
          clients={clients}
          onClose={() => setModal(null)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar cita, cliente o hora..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" /> Nueva cita
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: appointments.length, color: 'bg-gray-100 text-gray-700' },
          { label: 'Agendadas', value: appointments.filter(a => a.status === 'scheduled').length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Completadas', value: appointments.filter(a => a.status === 'completed').length, color: 'bg-green-50 text-green-700' },
          { label: 'Vía n8n', value: appointments.filter(a => a.source === 'n8n').length, color: 'bg-cyan-50 text-cyan-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Cargando citas...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? 'Sin resultados' : 'Sin citas aún'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Hora</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Asunto</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Fuente</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Meet</th>
                <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-700 font-medium whitespace-nowrap">{formatDate(a.appointment_date)}</td>
                  <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {a.time_slot}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{clientMap[a.client_id]?.name || '—'}</div>
                    <div className="text-xs text-gray-400">{clientMap[a.client_id]?.email || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">{a.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${SOURCE_COLORS[a.source] || 'bg-gray-100 text-gray-600'}`}>
                      {SOURCE_LABELS[a.source] || a.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {a.meeting_link ? (
                      <a href={a.meeting_link} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-semibold">
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal(a)}
                        className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar cita "${a.title}"?`)) deleteMutation.mutate(a.id); }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
