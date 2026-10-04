import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, KanbanSquare, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { staffBase } from '../../lib/roles';
import { apiError, formatPhone, timeAgo } from '../../lib/format';
import { STAGES } from '../../lib/stages';
import { Card, EmptyState, ErrorText, SearchInput, Spinner } from '../../components/ui';

export default function Pipeline() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const base = staffBase(user.role);
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['wa-conversations', ''],
    queryFn: () => api.get('/whatsapp/conversations').then((r) => r.data),
    refetchInterval: 15000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }) => api.patch(`/whatsapp/conversations/${id}`, { stage }),
    // Mueve la tarjeta al instante; si el servidor falla se recarga el estado real
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['wa-conversations', ''] });
      qc.setQueryData(['wa-conversations', ''], (old = []) => old.map((c) => (c.id === id ? { ...c, stage } : c)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['wa-conversations'] }),
  });

  const q = search.trim().toLowerCase();
  const filtered = conversations.filter((c) => !q || (c.contact_name || '').toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, '') || '~'));

  if (isLoading) return <Spinner />;

  if (conversations.length === 0) {
    return (
      <Card>
        <EmptyState icon={KanbanSquare} title="Todavía no hay leads">
          Cada chat de WhatsApp que registre n8n aparece aquí como un lead en la etapa «Nuevo».
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar lead..." className="max-w-sm" />
        <p className="text-xs text-gray-500">Arrastra una tarjeta para cambiarla de etapa, o usa el selector de la tarjeta.</p>
      </div>
      <ErrorText>{moveMutation.isError && apiError(moveMutation.error)}</ErrorText>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 snap-x">
        {STAGES.map((stage) => {
          const items = filtered.filter((c) => c.stage === stage.id);
          return (
            <section
              key={stage.id}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => {
                const conv = conversations.find((c) => c.id === dragId);
                if (conv && conv.stage !== stage.id) moveMutation.mutate({ id: dragId, stage: stage.id });
                setDragId(null); setOverStage(null);
              }}
              className={clsx('w-72 shrink-0 snap-start rounded-3xl p-2 transition-colors', overStage === stage.id ? 'bg-brand-100/70' : 'bg-transparent')}
              aria-label={stage.label}
            >
              <header className="flex items-center justify-between px-2 py-2 mb-1">
                <h2 className="text-sm font-bold text-gray-900">{stage.label}</h2>
                <span className="text-xs font-bold text-gray-600 bg-white border border-brand-100/70 rounded-full min-w-7 h-7 px-2 flex items-center justify-center tabular-nums">{items.length}</span>
              </header>
              <div className="flex flex-col gap-2.5 min-h-24">
                {items.map((c) => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                    className={clsx('p-4 cursor-grab active:cursor-grabbing', dragId === c.id && 'opacity-50')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">{c.contact_name || formatPhone(c.phone)}</div>
                        {c.contact_name && <div className="text-[11px] text-gray-500">{formatPhone(c.phone)}</div>}
                      </div>
                      {c.unread_count > 0 && (
                        <span className="bg-brand-600 text-white text-[10px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">{c.unread_count}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">{c.notes || c.last_message_text || 'Sin mensajes'}</p>
                    <div className="flex items-center justify-between gap-2 mt-3 text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Bot className={clsx('w-3.5 h-3.5', c.ai_enabled ? 'text-brand-500' : 'text-gray-300')} />
                        {c.ai_enabled ? 'IA activa' : 'IA pausada'}
                      </span>
                      <span>{timeAgo(c.last_message_at || c.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-50">
                      <select
                        aria-label="Mover de etapa"
                        value={c.stage}
                        onChange={(e) => moveMutation.mutate({ id: c.id, stage: e.target.value })}
                        className="flex-1 text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-400"
                      >
                        {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <Link
                        to={`${base}/whatsapp?c=${c.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl px-2.5 py-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Link>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="border-2 border-dashed border-brand-100 rounded-3xl py-8 text-center text-[11px] text-gray-400">Sin leads</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
