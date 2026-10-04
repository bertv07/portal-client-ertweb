import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CalendarCheck, Clock, ExternalLink } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { apiError, formatPhone, longDate, TIME_SLOTS } from '../../lib/format';
import { APPOINTMENT_STATUS } from '../../lib/stages';
import {
  Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, Spinner, StatTile, Table, tdClass, inputClass,
} from '../../components/ui';

const SOURCE_LABELS = { client: 'Cliente', admin: 'Admin', seller: 'Vendedor', n8n: 'n8n' };

function AppointmentFormModal({ appointment, clients, isAdmin, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(appointment ? {
    title: appointment.title,
    description: appointment.description || '',
    appointment_date: appointment.appointment_date,
    time_slot: appointment.time_slot,
    duration_minutes: appointment.duration_minutes || 30,
    status: appointment.status,
    meeting_link: appointment.meeting_link || '',
    notes: appointment.notes || '',
  } : {
    who: isAdmin ? 'client' : 'contact',
    client_id: '', contact_name: '', contact_phone: '',
    title: '', description: '', appointment_date: '', time_slot: '09:00 AM',
    duration_minutes: 30, status: 'scheduled', meeting_link: '', notes: '',
  });
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => (appointment ? api.put(`/appointments/${appointment.id}`, data) : api.post('/appointments/', data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { who, ...rest } = form;
    const data = { ...rest, duration_minutes: Number(form.duration_minutes), meeting_link: form.meeting_link || null };
    if (!appointment) {
      if (who === 'client') { data.contact_name = null; data.contact_phone = null; } else { data.client_id = null; }
    }
    mutation.mutate(data);
  };

  // Un horario que no esté en la lista (p. ej. creado por n8n) se conserva al editar
  const slots = TIME_SLOTS.includes(form.time_slot) ? TIME_SLOTS : [form.time_slot, ...TIME_SLOTS];

  return (
    <Modal title={appointment ? 'Editar cita' : 'Nueva cita'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!appointment && (
          <>
            {isAdmin && (
              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
                {[['client', 'Cliente del portal'], ['contact', 'Lead / contacto']].map(([id, label]) => (
                  <button
                    key={id} type="button" onClick={() => setForm((p) => ({ ...p, who: id }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${form.who === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {form.who === 'client' ? (
              <Field label="Cliente">
                <select required className={inputClass} value={form.client_id} onChange={set('client_id')}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre del contacto"><input required className={inputClass} value={form.contact_name} onChange={set('contact_name')} /></Field>
                <Field label="Teléfono"><input className={inputClass} placeholder="+58 412 1234567" value={form.contact_phone} onChange={set('contact_phone')} /></Field>
              </div>
            )}
          </>
        )}

        <Field label="Asunto"><input required className={inputClass} value={form.title} onChange={set('title')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha"><input required type="date" className={inputClass} value={form.appointment_date} onChange={set('appointment_date')} /></Field>
          <Field label="Hora">
            <select required className={inputClass} value={form.time_slot} onChange={set('time_slot')}>
              {slots.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Duración">
            <select className={inputClass} value={form.duration_minutes} onChange={set('duration_minutes')}>
              {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={form.status} onChange={set('status')}>
              {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Link de la reunión (Meet / Zoom)"><input type="url" className={inputClass} placeholder="https://" value={form.meeting_link} onChange={set('meeting_link')} /></Field>
        <Field label="Notas internas"><textarea rows={2} className={`${inputClass} resize-none`} value={form.notes} onChange={set('notes')} /></Field>
        <ErrorText>{mutation.isError && apiError(mutation.error, 'Error al guardar la cita')}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel={appointment ? 'Guardar cambios' : 'Crear cita'} loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

export default function Agenda() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('upcoming');
  const [modal, setModal] = useState(null); // null | 'create' | appointment

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments/').then((r) => r.data),
  });
  // Solo el admin puede listar las cuentas de clientes
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-users', 'client'],
    queryFn: () => api.get('/users/').then((r) => r.data),
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const who = (a) => clientMap[a.client_id]?.name || a.contact_name || (a.client_id ? 'Cliente del portal' : '—');
  const whoSub = (a) => clientMap[a.client_id]?.email || formatPhone(a.contact_phone);

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const isUpcoming = (a) => a.appointment_date >= today && a.status === 'scheduled';
  const q = search.trim().toLowerCase();
  const filtered = appointments
    .filter((a) => (tab === 'upcoming' ? isUpcoming(a) : !isUpcoming(a)))
    .filter((a) => !q || a.title.toLowerCase().includes(q) || who(a).toLowerCase().includes(q))
    .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * a.appointment_date.localeCompare(b.appointment_date));

  return (
    <div className="flex flex-col gap-5">
      {modal !== null && (
        <AppointmentFormModal appointment={modal === 'create' ? null : modal} clients={clients} isAdmin={isAdmin} onClose={() => setModal(null)} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={CalendarCheck} label="Hoy" value={appointments.filter((a) => a.appointment_date === today && a.status === 'scheduled').length} sub="citas agendadas" />
        <StatTile icon={Clock} label="Próximas" value={appointments.filter(isUpcoming).length} sub="por atender" tone="blue" />
        <StatTile label="Completadas" value={appointments.filter((a) => a.status === 'completed').length} sub="en total" />
        <StatTile label="No asistió" value={appointments.filter((a) => a.status === 'no_show').length} sub="en total" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 bg-white border border-brand-100/70 p-1 rounded-full">
          {[['upcoming', 'Próximas'], ['past', 'Historial']].map(([id, label]) => (
            <button
              key={id} onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${tab === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cita o persona..." />
        <Button onClick={() => setModal('create')}><Plus className="w-4 h-4" /> Nueva cita</Button>
      </div>
      <ErrorText>{deleteMutation.isError && apiError(deleteMutation.error)}</ErrorText>

      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={CalendarCheck} title={search ? 'Sin resultados' : tab === 'upcoming' ? 'No hay citas próximas' : 'Sin historial todavía'}>
            {tab === 'upcoming' && !search && 'Agenda una desde aquí o directamente desde un chat de WhatsApp.'}
          </EmptyState>
        ) : (
          <Table columns={['Fecha', 'Hora', 'Con', 'Asunto', 'Estado', 'Origen', 'Reunión', { label: 'Acciones', right: true }]}>
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-brand-50/40 transition-colors">
                <td className={`${tdClass} font-semibold text-gray-800 whitespace-nowrap capitalize`}>{longDate(a.appointment_date)}</td>
                <td className={`${tdClass} text-gray-600 whitespace-nowrap tabular-nums`}>{a.time_slot} · {a.duration_minutes} min</td>
                <td className={tdClass}>
                  <div className="font-semibold text-gray-900">{who(a)}</div>
                  <div className="text-xs text-gray-400">{whoSub(a)}</div>
                </td>
                <td className={`${tdClass} text-gray-700 max-w-[220px] truncate`} title={a.title}>{a.title}</td>
                <td className={tdClass}><Badge tone={APPOINTMENT_STATUS[a.status]?.tone} dot>{APPOINTMENT_STATUS[a.status]?.label || a.status}</Badge></td>
                <td className={`${tdClass} text-xs text-gray-500`}>{SOURCE_LABELS[a.source] || a.source}</td>
                <td className={tdClass}>
                  {a.meeting_link ? (
                    <a href={a.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline text-xs font-semibold">
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir
                    </a>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setModal(a)} aria-label="Editar cita"><Edit2 className="w-4 h-4" /></Button>
                    <Button
                      variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" aria-label="Eliminar cita"
                      onClick={() => { if (confirm(`¿Eliminar la cita "${a.title}"?`)) deleteMutation.mutate(a.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
