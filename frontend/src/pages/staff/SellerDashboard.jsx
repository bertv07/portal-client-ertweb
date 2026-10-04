import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Users, CalendarCheck, Trophy, ArrowUpRight, Bot } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { staffBase } from '../../lib/roles';
import { formatPhone, longDate, timeAgo } from '../../lib/format';
import { STAGES } from '../../lib/stages';
import { Avatar, Card, CardTitle, EmptyState, Spinner, StatTile } from '../../components/ui';
import { BarChart, Gauge, HBarList } from '../../components/ui/charts';

const dayKey = (d) => d.toLocaleDateString('en-CA');

export function SalesOverview() {
  const { user } = useAuth();
  const base = staffBase(user.role);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['wa-conversations', ''],
    queryFn: () => api.get('/whatsapp/conversations').then((r) => r.data),
    refetchInterval: 15000,
  });
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments/').then((r) => r.data),
  });
  const { data: settings } = useQuery({
    queryKey: ['wa-settings'],
    queryFn: () => api.get('/whatsapp/settings').then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  const today = dayKey(new Date());
  const unread = conversations.filter((c) => c.unread_count > 0);
  const open = conversations.filter((c) => !['won', 'lost'].includes(c.stage));
  const won = conversations.filter((c) => c.stage === 'won').length;
  const lost = conversations.filter((c) => c.stage === 'lost').length;
  const upcoming = appointments
    .filter((a) => a.status === 'scheduled' && a.appointment_date >= today)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  // Leads nuevos por día, últimos 7 días
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const newPerDay = days.map((d) => ({
    label: d.toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', ''),
    value: conversations.filter((c) => dayKey(new Date(c.created_at)) === dayKey(d)).length,
  }));
  const weekTotal = newPerDay.reduce((s, d) => s + d.value, 0);

  const byStage = STAGES.filter((s) => !['won', 'lost'].includes(s.id)).map((s) => ({
    label: s.label, value: conversations.filter((c) => c.stage === s.id).length,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile icon={MessageCircle} label="Chats sin leer" value={unread.length} sub={unread.length ? 'esperan respuesta' : 'todo al día'} tone={unread.length ? 'amber' : 'green'} />
        <StatTile icon={Users} label="Leads activos" value={open.length} sub={`${conversations.length} chats en total`} />
        <StatTile icon={CalendarCheck} label="Citas próximas" value={upcoming.length} sub={`${upcoming.filter((a) => a.appointment_date === today).length} hoy`} tone="blue" />
        <StatTile icon={Trophy} label="Ventas cerradas" value={won} sub={`${lost} perdidos`} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <CardTitle>Leads nuevos · últimos 7 días</CardTitle>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-4xl font-extrabold text-gray-900 tracking-tight tabular-nums">{weekTotal}</span>
            <span className="text-xs text-gray-500">chats nuevos esta semana</span>
          </div>
          <BarChart data={newPerDay} highlight={6} format={(v) => `${v} ${v === 1 ? 'lead' : 'leads'}`} emptyLabel="Sin leads nuevos esta semana" />
        </Card>

        <Card className="p-6 flex flex-col">
          <CardTitle>Cierre</CardTitle>
          <div className="flex-1 flex items-center justify-center">
            {won + lost === 0 ? (
              <EmptyState title="Sin leads cerrados">Aparecerá cuando marques leads como ganados o perdidos.</EmptyState>
            ) : (
              <Gauge value={Math.round((won / (won + lost)) * 100)} label="Leads ganados" sub={`${won} de ${won + lost} cerrados`} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-brand-50 text-xs text-gray-600">
            <Bot className={settings?.ai_enabled === false ? 'w-4 h-4 text-gray-400' : 'w-4 h-4 text-brand-600'} />
            {settings?.ai_enabled === false ? 'La IA está apagada para todos los chats.' : `IA activa · ${conversations.filter((c) => !c.ai_enabled).length} chats pausados`}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6">
          <CardTitle action={<Link to={`${base}/pipeline`} className="text-xs font-bold text-brand-700 inline-flex items-center gap-1">Ver pipeline <ArrowUpRight className="w-3.5 h-3.5" /></Link>}>
            Leads por etapa
          </CardTitle>
          <HBarList data={byStage} />
        </Card>

        <Card className="p-6">
          <CardTitle action={<Link to={`${base}/whatsapp`} className="text-xs font-bold text-brand-700 inline-flex items-center gap-1">Abrir bandeja <ArrowUpRight className="w-3.5 h-3.5" /></Link>}>
            Esperan respuesta
          </CardTitle>
          {unread.length === 0 ? (
            <EmptyState icon={MessageCircle} title="Nada pendiente">No hay chats sin leer.</EmptyState>
          ) : (
            <div className="flex flex-col gap-1 -mx-2">
              {unread.slice(0, 5).map((c) => (
                <Link key={c.id} to={`${base}/whatsapp?c=${c.id}`} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-brand-50 transition-colors">
                  <Avatar name={c.contact_name || c.phone} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{c.contact_name || formatPhone(c.phone)}</div>
                    <div className="text-xs text-gray-500 truncate">{c.last_message_text}</div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.last_message_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <CardTitle action={<Link to={user.role === 'admin' ? '/admin/appointments' : '/seller/agenda'} className="text-xs font-bold text-brand-700 inline-flex items-center gap-1">Ver agenda <ArrowUpRight className="w-3.5 h-3.5" /></Link>}>
            Próximas citas
          </CardTitle>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Agenda libre">No hay citas próximas.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex flex-col items-center justify-center shrink-0 leading-none">
                    <span className="text-sm font-extrabold">{a.appointment_date.slice(8, 10)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{a.title}</div>
                    <div className="text-xs text-gray-500 truncate capitalize">{longDate(a.appointment_date)} · {a.time_slot}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  return <SalesOverview />;
}
