import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, Send, Bot, ArrowLeft, CalendarPlus, UserPlus, Plus, AlertCircle, RotateCw,
  CheckCircle2, Paperclip, Info, ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';
import { apiError, clockTime, formatPhone, timeAgo, TIME_SLOTS } from '../../lib/format';
import { STAGES, STAGE_MAP } from '../../lib/stages';
import {
  Avatar, Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, Spinner, Toggle, inputClass,
} from '../../components/ui';

const convName = (c) => c?.contact_name || formatPhone(c?.phone);

// ─── Modales ─────────────────────────────────────────────────────────────────

function NewChatModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ phone: '', contact_name: '' });
  const mutation = useMutation({
    mutationFn: (data) => api.post('/whatsapp/conversations', data).then((r) => r.data),
    onSuccess: onCreated,
  });
  return (
    <Modal title="Nuevo chat" subtitle="Abre una conversación con un número para escribirle primero." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-4">
        <Field label="Teléfono (con código de país)">
          <input required className={inputClass} placeholder="+58 412 1234567" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </Field>
        <Field label="Nombre (opcional)">
          <input className={inputClass} value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
        </Field>
        <ErrorText>{mutation.isError && apiError(mutation.error)}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel="Abrir chat" loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

function ScheduleModal({ conversation, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: `Llamada con ${convName(conversation)}`, appointment_date: '', time_slot: '10:00 AM', duration_minutes: 30, notes: '' });
  const mutation = useMutation({
    mutationFn: (data) => api.post(`/whatsapp/conversations/${conversation.id}/appointment`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
  const result = mutation.data;
  const today = new Date().toISOString().split('T')[0];

  if (result) {
    const synced = result.n8n_status === 'success';
    return (
      <Modal title="Cita agendada" onClose={onClose} size="sm">
        <div className="text-center">
          <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3', synced ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
            {synced ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
          </div>
          <p className="text-sm text-gray-700 font-semibold">{result.appointment.title}</p>
          <p className="text-xs text-gray-500 mt-1">{result.appointment.appointment_date} · {result.appointment.time_slot}</p>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            {synced
              ? 'Quedó guardada en la agenda y se envió al calendario por n8n.'
              : `Quedó guardada en la agenda del portal, pero n8n no respondió (${result.n8n_error}). Revisa el workflow de agendamiento: el evento no se creó en el calendario.`}
          </p>
          {result.appointment.meeting_link && (
            <a href={result.appointment.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 mt-3">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir link de la reunión
            </a>
          )}
          <Button className="w-full mt-5" onClick={onClose}>Listo</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Agendar cita" subtitle={`Con ${convName(conversation)} · ${formatPhone(conversation.phone)}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, duration_minutes: Number(form.duration_minutes) }); }} className="flex flex-col gap-4">
        <Field label="Asunto">
          <input required className={inputClass} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input required type="date" min={today} className={inputClass} value={form.appointment_date} onChange={(e) => setForm((p) => ({ ...p, appointment_date: e.target.value }))} />
          </Field>
          <Field label="Hora">
            <select className={inputClass} value={form.time_slot} onChange={(e) => setForm((p) => ({ ...p, time_slot: e.target.value }))}>
              {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Duración">
          <select className={inputClass} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))}>
            {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </Field>
        <Field label="Notas (opcional)">
          <textarea rows={2} className={clsx(inputClass, 'resize-none')} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </Field>
        <ErrorText>{mutation.isError && apiError(mutation.error)}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel="Agendar" loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

function ConvertModal({ conversation, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: conversation.contact_name || '', email: '', password: '' });
  const mutation = useMutation({
    mutationFn: (data) => api.post(`/whatsapp/conversations/${conversation.id}/convert`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  if (mutation.data) {
    return (
      <Modal title="Cuenta creada" onClose={onClose} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <p className="text-sm text-gray-700">
            <strong>{mutation.data.name}</strong> ya puede entrar al portal con <strong>{mutation.data.email}</strong> y la contraseña que definiste.
          </p>
          <p className="text-xs text-gray-500 mt-2">El chat quedó en «Venta cerrada». El administrador ya puede crearle el proyecto y la factura.</p>
          <Button className="w-full mt-5" onClick={onClose}>Listo</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Crear cuenta de cliente" subtitle="Venta cerrada: dale acceso al portal a este contacto." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-4">
        <Field label="Nombre completo">
          <input required className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label="Correo">
          <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </Field>
        <Field label="Contraseña inicial" hint="Mínimo 6 caracteres. El cliente puede cambiarla al entrar.">
          <input required minLength={6} className={inputClass} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </Field>
        <ErrorText>{mutation.isError && apiError(mutation.error)}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel="Crear cuenta" loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

// ─── Panel de detalles del chat ──────────────────────────────────────────────

function DetailsPanel({ conversation, globalAi, onUpdate, updating }) {
  const [name, setName] = useState(conversation.contact_name || '');
  const [notes, setNotes] = useState(conversation.notes || '');
  const [modal, setModal] = useState(null);

  return (
    <div className="flex flex-col gap-5 p-5">
      {modal === 'schedule' && <ScheduleModal conversation={conversation} onClose={() => setModal(null)} />}
      {modal === 'convert' && <ConvertModal conversation={conversation} onClose={() => setModal(null)} />}

      <div className="flex flex-col items-center text-center">
        <Avatar name={convName(conversation)} size="lg" />
        <div className="font-bold text-gray-900 mt-2">{convName(conversation)}</div>
        {conversation.contact_name && <div className="text-xs text-gray-500">{formatPhone(conversation.phone)}</div>}
        {conversation.client_id && <Badge tone="green" dot className="mt-2">Cliente del portal</Badge>}
      </div>

      <div className={clsx('rounded-2xl p-4 border', conversation.ai_enabled && globalAi ? 'bg-brand-50 border-brand-100' : 'bg-gray-50 border-gray-200')}>
        <div className="flex items-center gap-3">
          <Bot className={clsx('w-5 h-5 shrink-0', conversation.ai_enabled && globalAi ? 'text-brand-600' : 'text-gray-400')} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900">IA en este chat</div>
            <div className="text-[11px] text-gray-500 leading-snug">
              {!globalAi ? 'La IA está apagada para todos los chats.' : conversation.ai_enabled ? 'La IA responde automáticamente.' : 'Pausada: respondes tú.'}
            </div>
          </div>
          <Toggle checked={conversation.ai_enabled} disabled={updating} label="IA en este chat" onChange={(v) => onUpdate({ ai_enabled: v })} />
        </div>
      </div>

      <Field label="Etapa de venta">
        <select className={inputClass} value={conversation.stage} onChange={(e) => onUpdate({ stage: e.target.value })}>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>

      <Field label="Nombre del contacto">
        <input
          className={inputClass} value={name} placeholder="Sin nombre"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== (conversation.contact_name || '') && onUpdate({ contact_name: name })}
        />
      </Field>

      <Field label="Notas internas" hint="Solo las ve el equipo. Se guardan al salir del campo.">
        <textarea
          rows={4} className={clsx(inputClass, 'resize-none')} value={notes} placeholder="Qué necesita, presupuesto, próximos pasos..."
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (conversation.notes || '') && onUpdate({ notes })}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <Button variant="soft" onClick={() => setModal('schedule')}><CalendarPlus className="w-4 h-4" /> Agendar cita</Button>
        {!conversation.client_id && (
          <Button variant="outline" onClick={() => setModal('convert')}><UserPlus className="w-4 h-4" /> Crear cuenta de cliente</Button>
        )}
      </div>
    </div>
  );
}

// ─── Hilo de mensajes ────────────────────────────────────────────────────────

function Bubble({ message, onRetry }) {
  const out = message.direction === 'out';
  const failed = message.status === 'failed';
  const byAi = message.sender === 'ai';
  return (
    <div className={clsx('flex', out ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div
          className={clsx(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
            !out && 'bg-white border border-brand-100/70 text-gray-800 rounded-bl-md',
            out && byAi && 'bg-brand-100 text-brand-900 rounded-br-md',
            out && !byAi && !failed && 'bg-brand-600 text-white rounded-br-md',
            failed && 'bg-red-50 border border-red-200 text-red-800 rounded-br-md',
          )}
        >
          {message.media_url && (
            <a href={message.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold underline mb-1">
              <Paperclip className="w-3.5 h-3.5" /> {message.media_type || 'Archivo adjunto'}
            </a>
          )}
          {message.text}
        </div>
        <div className={clsx('flex items-center gap-1.5 mt-1 text-[10px] text-gray-400', out && 'justify-end')}>
          {byAi && <span className="inline-flex items-center gap-1 font-semibold text-brand-600"><Bot className="w-3 h-3" /> IA</span>}
          {out && !byAi && !failed && <span className="font-semibold">Tú / equipo</span>}
          {failed ? (
            <button onClick={() => onRetry(message.text)} className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline">
              <AlertCircle className="w-3 h-3" /> No enviado · Reintentar <RotateCw className="w-3 h-3" />
            </button>
          ) : (
            <span>{clockTime(message.created_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Thread({ conversation, globalAi, onBack, onToggleDetails }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['wa-messages', conversation.id],
    queryFn: () => api.get(`/whatsapp/conversations/${conversation.id}/messages`).then((r) => r.data),
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: (body) => api.post(`/whatsapp/conversations/${conversation.id}/send`, { text: body }),
    onSuccess: () => setText(''),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['wa-messages', conversation.id] });
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, conversation.id]);

  const submit = (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (body && !sendMutation.isPending) sendMutation.mutate(body);
  };

  const aiActive = conversation.ai_enabled && globalAi;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-100/70">
        <button onClick={onBack} aria-label="Volver a los chats" className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar name={convName(conversation)} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{convName(conversation)}</div>
          <div className="text-[11px] text-gray-500 truncate">{formatPhone(conversation.phone)}</div>
        </div>
        <Badge tone={aiActive ? 'brand' : 'gray'} dot>{aiActive ? 'IA activa' : 'IA pausada'}</Badge>
        <button onClick={onToggleDetails} aria-label="Detalles del chat" className="xl:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <Info className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-brand-50/50">
        {isLoading ? <Spinner /> : messages.length === 0 ? (
          <EmptyState icon={MessageCircle} title="Sin mensajes todavía">Escribe el primer mensaje para iniciar la conversación.</EmptyState>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} onRetry={(t) => sendMutation.mutate(t)} />)
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="p-3 border-t border-brand-100/70">
        {sendMutation.isError && <div className="mb-2"><ErrorText>{apiError(sendMutation.error)}</ErrorText></div>}
        {aiActive && (
          <p className="text-[11px] text-gray-500 mb-2 px-1">
            La IA sigue activa en este chat. Si vas a atenderlo tú, pausa la IA para que no respondan los dos.
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Escribe un mensaje..."
            className={clsx(inputClass, 'resize-none max-h-32 rounded-3xl')}
          />
          <Button type="submit" size="icon" className="!p-3 !rounded-full shrink-0" loading={sendMutation.isPending} disabled={!text.trim()} aria-label="Enviar">
            {!sendMutation.isPending && <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function WhatsAppInbox() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { data: conversations = [], isLoading, isError, error } = useQuery({
    queryKey: ['wa-conversations', search],
    queryFn: () => api.get('/whatsapp/conversations', { params: search ? { search } : {} }).then((r) => r.data),
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  const { data: settings } = useQuery({
    queryKey: ['wa-settings'],
    queryFn: () => api.get('/whatsapp/settings').then((r) => r.data),
  });
  const globalAi = settings?.ai_enabled ?? true;

  const globalMutation = useMutation({
    mutationFn: (ai_enabled) => api.put('/whatsapp/settings', { ai_enabled }).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(['wa-settings'], data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/whatsapp/conversations/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-conversations'] }),
  });

  const select = (id) => {
    setShowDetails(false);
    setParams(id ? { c: id } : {});
  };

  const selected = conversations.find((c) => c.id === selectedId);
  const visible = conversations.filter((c) =>
    filter === 'all' ? true : filter === 'unread' ? c.unread_count > 0 : filter === 'human' ? !c.ai_enabled : true);

  return (
    <div className="flex flex-col gap-4 h-[calc(100dvh-6.5rem)]">
      {showNew && (
        <NewChatModal
          onClose={() => setShowNew(false)}
          onCreated={(conv) => { qc.invalidateQueries({ queryKey: ['wa-conversations'] }); setShowNew(false); select(conv.id); }}
        />
      )}

      {/* Interruptor general de la IA */}
      <Card className={clsx('px-5 py-3.5 flex items-center gap-3 shrink-0', selected && 'hidden lg:flex')}>
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', globalAi ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400')}>
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">Asistente de IA {globalAi ? 'activo' : 'apagado'}</div>
          <div className="text-[11px] text-gray-500 truncate">
            {globalAi ? 'Responde los chats que no tengas pausados.' : 'No responde ningún chat hasta que lo vuelvas a encender.'}
          </div>
        </div>
        {globalMutation.isError && <span className="text-[11px] text-red-600 font-medium hidden sm:block">{apiError(globalMutation.error)}</span>}
        <Toggle checked={globalAi} disabled={globalMutation.isPending || !settings} label="IA para todos los chats" onChange={(v) => globalMutation.mutate(v)} />
      </Card>

      <Card className="flex-1 min-h-0 flex overflow-hidden">
        {/* Lista de chats */}
        <div className={clsx('w-full lg:w-80 lg:border-r border-brand-100/70 flex-col min-h-0 shrink-0', selected ? 'hidden lg:flex' : 'flex')}>
          <div className="p-3 flex flex-col gap-2.5 border-b border-brand-100/70">
            <div className="flex gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar nombre o número" />
              <Button size="icon" className="!p-3 !rounded-full shrink-0" onClick={() => setShowNew(true)} aria-label="Nuevo chat"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex gap-1.5">
              {[['all', 'Todos'], ['unread', 'Sin leer'], ['human', 'IA pausada']].map(([id, label]) => (
                <button
                  key={id} onClick={() => setFilter(id)}
                  className={clsx('px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors', filter === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading ? <Spinner /> : isError ? (
              <div className="p-4"><ErrorText>{apiError(error)}</ErrorText></div>
            ) : visible.length === 0 ? (
              <EmptyState icon={MessageCircle} title={conversations.length ? 'Nada con ese filtro' : 'Sin chats todavía'}>
                {conversations.length ? 'Prueba con otro filtro o búsqueda.' : 'Cuando n8n registre un mensaje de WhatsApp aparecerá aquí.'}
              </EmptyState>
            ) : (
              visible.map((c) => (
                <button
                  key={c.id} onClick={() => select(c.id)}
                  className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-brand-50 transition-colors', c.id === selectedId ? 'bg-brand-50' : 'hover:bg-gray-50')}
                >
                  <Avatar name={convName(c)} tone={c.id === selectedId ? 'solid' : 'brand'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={clsx('text-sm truncate', c.unread_count ? 'font-bold text-gray-900' : 'font-semibold text-gray-800')}>{convName(c)}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={clsx('text-xs truncate flex-1', c.unread_count ? 'text-gray-800 font-medium' : 'text-gray-500')}>{c.last_message_text || 'Sin mensajes'}</span>
                      {!c.ai_enabled && <Bot className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-label="IA pausada" />}
                      {c.unread_count > 0 && (
                        <span className="bg-brand-600 text-white text-[10px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">{c.unread_count}</span>
                      )}
                    </div>
                    <div className="mt-1.5"><Badge tone={STAGE_MAP[c.stage]?.tone}>{STAGE_MAP[c.stage]?.label || c.stage}</Badge></div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Hilo */}
        <div className={clsx('flex-1 min-w-0 min-h-0 flex-col', selected ? 'flex' : 'hidden lg:flex')}>
          {selected ? (
            <Thread key={selected.id} conversation={selected} globalAi={globalAi} onBack={() => select(null)} onToggleDetails={() => setShowDetails(true)} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={MessageCircle} title="Elige un chat">Selecciona una conversación para ver los mensajes, responder, pausar la IA o agendar una cita.</EmptyState>
            </div>
          )}
        </div>

        {/* Detalles — columna fija en pantallas grandes */}
        {selected && (
          <div className="hidden xl:block w-80 border-l border-brand-100/70 overflow-y-auto shrink-0">
            <DetailsPanel
              key={selected.id} conversation={selected} globalAi={globalAi} updating={updateMutation.isPending}
              onUpdate={(data) => updateMutation.mutate({ id: selected.id, data })}
            />
          </div>
        )}
      </Card>

      {/* Detalles — modal en pantallas pequeñas */}
      {selected && showDetails && (
        <div className="xl:hidden">
          <Modal title="Detalles del chat" onClose={() => setShowDetails(false)}>
            <div className="-m-5">
              <DetailsPanel
                key={selected.id} conversation={selected} globalAi={globalAi} updating={updateMutation.isPending}
                onUpdate={(data) => updateMutation.mutate({ id: selected.id, data })}
              />
            </div>
          </Modal>
        </div>
      )}
      {updateMutation.isError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]"><ErrorText>{apiError(updateMutation.error)}</ErrorText></div>
      )}
    </div>
  );
}
