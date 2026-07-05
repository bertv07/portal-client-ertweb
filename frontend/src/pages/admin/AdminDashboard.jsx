import { useQuery } from '@tanstack/react-query';
import { Users, FolderOpen, Wallet, Wrench, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../lib/axios';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm font-medium text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects/').then(r => r.data),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api.get('/invoices/').then(r => r.data),
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['admin-docs'],
    queryFn: () => api.get('/documents/').then(r => r.data),
  });

  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const pendingDocs = docs.filter(d => d.status === 'review');
  const activeProjects = projects.filter(p => p.status === 'active');

  const pendingRevenue = pendingInvoices.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Clientes activos"
          value={clients.length}
          color="bg-blue-50 text-blue-600"
          sub="Total registrados"
        />
        <StatCard
          icon={FolderOpen}
          label="Proyectos activos"
          value={activeProjects.length}
          color="bg-brand-50 text-brand-600"
          sub={`${projects.length} total`}
        />
        <StatCard
          icon={Wallet}
          label="Facturas pendientes"
          value={pendingInvoices.length}
          color="bg-amber-50 text-amber-600"
          sub={`$${pendingRevenue.toFixed(0)} USD por cobrar`}
        />
        <StatCard
          icon={AlertCircle}
          label="Docs en revisión"
          value={pendingDocs.length}
          color="bg-red-50 text-red-500"
          sub="Requieren aprobación"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" /> Clientes recientes
          </h2>
          {clients.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin clientes aún</p>
          ) : (
            <div className="flex flex-col gap-2">
              {clients.slice(0, 5).map(client => (
                <div key={client.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                    {client.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{client.name}</div>
                    <div className="text-xs text-gray-400 truncate">{client.email}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(client.created_at).toLocaleDateString('es-ES')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent projects */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-brand-600" /> Proyectos recientes
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin proyectos aún</p>
          ) : (
            <div className="flex flex-col gap-2">
              {projects.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    p.status === 'active' ? 'bg-green-500' :
                    p.status === 'completed' ? 'bg-gray-400' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.phase} · {p.progress_pct}%</div>
                  </div>
                  <div className="w-16 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full"
                      style={{ width: `${p.progress_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending items */}
      {(pendingDocs.length > 0 || pendingInvoices.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 mb-1">Pendientes de acción</div>
            <ul className="text-sm text-amber-800 space-y-0.5">
              {pendingDocs.length > 0 && <li>· {pendingDocs.length} documento(s) esperando aprobación</li>}
              {pendingInvoices.length > 0 && <li>· {pendingInvoices.length} factura(s) pendiente(s) de pago</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
