import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, CalendarCheck, ExternalLink, Check, X } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { apiError, formatPhone, longDate, TIME_SLOTS } from '../../lib/format';
import { APPOINTMENT_STATUS } from '../../lib/stages';
import {
  Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, LoadingBlock, Segmented, StatStrip, Table, tdClass, inputClass, textareaClass,
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
              <Segmented
                className="self-start" value={form.who} onChange={(who) => setForm((p) => ({ ...p, who }))}
                options={[{ id: 'client', label: 'Cliente del portal' }, { id: 'contact', label: 'Lead / contacto' }]}
              />
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
        <Field label="Notas internas"><textarea rows={2} className={textareaClass} value={form.notes} onChange={set('notes')} /></Field>
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
  const [tab, setTab] = useState(null); // null = decide según haya o no solicitudes por confirmar
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
  // Confirmar (pending → scheduled) crea el evento en el calendario y avisa al cliente
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/appointments/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const who = (a) => a.client_name || clientMap[a.client_id]?.name || a.contact_name || '—';
  const whoSub = (a) => a.client_email || clientMap[a.client_id]?.email || formatPhone(a.contact_phone);

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const isPending = (a) => a.status === 'pending';
  const isUpcoming = (a) => a.appointment_date >= today && a.status === 'scheduled';
  const pendingCount = appointments.filter(isPending).length;
  const activeTab = tab ?? (pendingCount > 0 ? 'pending' : 'upcoming');
  const inTab = { pending: isPending, upcoming: isUpcoming, past: (a) => !isPending(a) && !isUpcoming(a) }[activeTab];
  const q = search.trim().toLowerCase();
  const filtered = appointments
    .filter(inTab)
    .filter((a) => !q || a.title.toLowerCase().includes(q) || who(a).toLowerCase().includes(q))
    .sort((a, b) => (activeTab === 'past' ? -1 : 1) * a.appointment_date.localeCompare(b.appointment_date));

  const emptyCopy = {
    pending: ['Nada por confirmar', 'Cuando un cliente pida una reunión desde su portal aparecerá aquí para que la confirmes.'],
    upcoming: ['No hay citas próximas', 'Agenda una desde aquí o directamente desde un chat de WhatsApp.'],
    past: ['Sin historial todavía', ''],
  }[activeTab];

  return (
    <div className="flex flex-col gap-5">
      {modal !== null && (
        <AppointmentFormModal appointment={modal === 'create' ? null : modal} clients={clients} isAdmin={isAdmin} onClose={() => setModal(null)} />
      )}

      <StatStrip items={[
        { label: 'Por confirmar', value: pendingCount, sub: pendingCount ? 'esperan tu respuesta' : 'todo respondido', tone: pendingCount ? 'amber' : undefined },
        { label: 'Hoy', value: appointments.filter((a) => a.appointment_date === today && a.status === 'scheduled').length, sub: 'citas confirmadas' },
        { label: 'Próximas', value: appointments.filter(isUpcoming).length, sub: 'por atender' },
        { label: 'Completadas', value: appointments.filter((a) => a.status === 'completed').length, sub: `${appointments.filter((a) => a.status === 'no_show').length} no asistieron` },
      ]} />

      <div className="flex items-center gap-3 flex-wrap">
        <Segmented
          value={activeTab} onChange={setTab}
          options={[{ id: 'pending', label: 'Por confirmar', count: pendingCount }, { id: 'upcoming', label: 'Próximas' }, { id: 'past', label: 'Historial' }]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cita o persona..." />
        <Button onClick={() => setModal('create')}><Plus className="w-4 h-4" /> Nueva cita</Button>
      </div>
      <ErrorText>{(deleteMutation.isError && apiError(deleteMutation.error)) || (statusMutation.isError && apiError(statusMutation.error))}</ErrorText>

      <Card className="overflow-hidden">
        {isLoading ? <LoadingBlock /> : filtered.length === 0 ? (
          <EmptyState icon={CalendarCheck} title={search ? 'Sin resultados' : emptyCopy[0]}>{!search && emptyCopy[1]}</EmptyState>
        ) : (
          <Table columns={['Cuándo', 'Con', 'Estado', { label: 'Acciones', right: true }]}>
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-brand-50/40 transition-colors">
                <td className={`${tdClass} whitespace-nowrap`}>
                  <div className="font-semibold text-gray-900 first-letter:uppercase">{longDate(a.appointment_date)}</div>
                  <div className="text-[13px] text-gray-500 tabular-nums">{a.time_slot} · {a.duration_minutes} min</div>
                </td>
                <td className={`${tdClass} min-w-[200px]`}>
                  <div className="font-semibold text-gray-900">{who(a)}</div>
                  <div className="text-[13px] text-gray-500 truncate max-w-[320px]" title={a.title}>{a.title}</div>
                  <div className="text-xs text-gray-500">{[whoSub(a), `Origen: ${(SOURCE_LABELS[a.source] || a.source).toLowerCase()}`].filter(Boolean).join(' · ')}</div>
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <Badge tone={APPOINTMENT_STATUS[a.status]?.tone} dot>{APPOINTMENT_STATUS[a.status]?.label || a.status}</Badge>
                  {a.meeting_link && (
                    <a href={a.meeting_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-700 hover:underline text-xs font-semibold mt-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir reunión
                    </a>
                  )}
                </td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    {a.status === 'pending' && (
                      <>
                        <Button
                          size="sm" variant="success" loading={statusMutation.isPending && statusMutation.variables?.id === a.id}
                          onClick={() => statusMutation.mutate({ id: a.id, status: 'scheduled' })}
                        >
                          <Check className="w-3.5 h-3.5" /> Confirmar
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => { if (confirm(`¿Rechazar la reunión "${a.title}"? Se le avisará al cliente para que elija otro horario.`)) statusMutation.mutate({ id: a.id, status: 'cancelled' }); }}
                        >
                          <X className="w-3.5 h-3.5" /> Rechazar
                        </Button>
                      </>
                    )}
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
