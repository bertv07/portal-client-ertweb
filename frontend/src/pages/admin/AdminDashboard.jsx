import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Users, FolderKanban, Wallet, TrendingUp, ArrowUpRight, FileText, MessageCircle, CheckCircle2, ReceiptText } from 'lucide-react';
import api from '../../lib/axios';
import { money, moneyShort } from '../../lib/format';
import { Avatar, Card, CardTitle, EmptyState, StatTile } from '../../components/ui';
import { BarChart, HBarList, ProgressBar } from '../../components/ui/charts';

const PHASES = ['Planificación', 'Diseño', 'Desarrollo', 'QA', 'Entregado'];

export default function AdminDashboard() {
  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ['admin-projects'], queryFn: () => api.get('/projects/').then((r) => r.data) });
  const { data: invoices = [] } = useQuery({ queryKey: ['admin-invoices'], queryFn: () => api.get('/invoices/').then((r) => r.data) });
  const { data: docs = [] } = useQuery({ queryKey: ['admin-docs'], queryFn: () => api.get('/documents/').then((r) => r.data) });
  const { data: pendingPayments = [] } = useQuery({ queryKey: ['admin-pending-payments'], queryFn: () => api.get('/manual-payments/pending').then((r) => r.data) });
  const { data: conversations = [] } = useQuery({ queryKey: ['wa-conversations', ''], queryFn: () => api.get('/whatsapp/conversations').then((r) => r.data) });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const activeProjects = projects.filter((p) => p.status === 'active');
  const unpaid = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const receivable = unpaid.reduce((sum, i) => sum + i.amount, 0);
  const docsInReview = docs.filter((d) => d.status === 'review');
  const unreadChats = conversations.filter((c) => c.unread_count > 0).length;

  // Cobrado por mes (facturas pagadas), últimos 6 meses
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return d;
  });
  const sameMonth = (iso, d) => { const p = new Date(iso); return p.getFullYear() === d.getFullYear() && p.getMonth() === d.getMonth(); };
  const revenue = months.map((d) => ({
    label: d.toLocaleDateString('es-VE', { month: 'short' }).replace('.', ''),
    value: invoices.filter((i) => i.status === 'paid' && i.paid_at && sameMonth(i.paid_at, d)).reduce((s, i) => s + i.amount, 0),
  }));
  const thisMonth = revenue[5].value;

  const byPhase = PHASES.map((ph) => ({ label: ph, value: activeProjects.filter((p) => p.phase === ph).length }));

  const todo = [
    pendingPayments.length > 0 && { to: '/admin/payments', icon: Wallet, text: `${pendingPayments.length} comprobante(s) de pago por revisar` },
    docsInReview.length > 0 && { to: '/admin/documents', icon: FileText, text: `${docsInReview.length} documento(s) esperando aprobación` },
    unreadChats > 0 && { to: '/admin/whatsapp', icon: MessageCircle, text: `${unreadChats} chat(s) de WhatsApp sin leer` },
    unpaid.length > 0 && { to: '/admin/invoices', icon: ReceiptText, text: `${unpaid.length} factura(s) por cobrar · ${money(receivable)}` },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile icon={Users} label="Clientes" value={clients.length} sub="cuentas registradas" />
        <StatTile icon={FolderKanban} label="Proyectos activos" value={activeProjects.length} sub={`${projects.length} en total`} tone="blue" />
        <StatTile icon={Wallet} label="Por cobrar" value={moneyShort(receivable)} sub={`${unpaid.length} factura(s) pendiente(s)`} tone="amber" />
        <StatTile icon={TrendingUp} label="Cobrado este mes" value={moneyShort(thisMonth)} sub="facturas pagadas" tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <CardTitle>Ingresos cobrados · últimos 6 meses</CardTitle>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-4xl font-extrabold text-gray-900 tracking-tight tabular-nums">{moneyShort(revenue.reduce((s, m) => s + m.value, 0))}</span>
            <span className="text-xs text-gray-500">USD en el periodo</span>
          </div>
          <BarChart data={revenue} highlight={5} format={(v) => money(v)} emptyLabel="Todavía no hay facturas pagadas" />
        </Card>

        <Card className="p-6">
          <CardTitle>Pendientes de acción</CardTitle>
          {todo.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Todo al día">No hay nada esperando por ti.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {todo.map((t) => (
                <Link key={t.to} to={t.to} className="flex items-center gap-3 bg-brand-50/70 hover:bg-brand-100/70 rounded-2xl px-4 py-3 transition-colors group">
                  <t.icon className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-gray-800">{t.text}</span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-brand-700 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <CardTitle action={<Link to="/admin/projects" className="text-xs font-bold text-brand-700 inline-flex items-center gap-1">Ver todos <ArrowUpRight className="w-3.5 h-3.5" /></Link>}>
            Proyectos en curso
          </CardTitle>
          {activeProjects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="Sin proyectos activos">Crea un proyecto para que el cliente vea su avance.</EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {activeProjects.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-4">
                  <Avatar name={clientMap[p.client_id] || p.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <span className="text-sm font-bold text-gray-900 truncate">{p.name}</span>
                      <span className="text-xs text-gray-500 shrink-0 tabular-nums">{p.phase} · {p.progress_pct}%</span>
                    </div>
                    <ProgressBar value={p.progress_pct} />
                    <div className="text-[11px] text-gray-400 mt-1 truncate">{clientMap[p.client_id] || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <CardTitle>Proyectos activos por fase</CardTitle>
          {activeProjects.length === 0 ? <EmptyState title="Sin datos" /> : <HBarList data={byPhase} />}
        </Card>
      </div>
    </div>
  );
}
