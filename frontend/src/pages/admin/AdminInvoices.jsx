import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search, Download, Edit2, Trash2 } from 'lucide-react';
import api from '../../lib/axios';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

function CreateInvoiceModal({ clients, projects, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_id: '', project_id: '', number: '', description: '',
    amount: '', currency: 'USD', status: 'pending', due_date: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/invoices/', data),
    onSuccess: () => { qc.invalidateQueries(['admin-invoices']); onClose(); },
    onError: (e) => setError(e.response?.data?.detail || 'Error'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, amount: parseFloat(form.amount) };
    if (!data.project_id) delete data.project_id;
    if (!data.due_date) delete data.due_date;
    mutation.mutate(data);
  };

  const clientProjects = projects.filter(p => p.client_id === form.client_id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Nueva Factura</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
            <select required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value, project_id: '' }))}>
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {form.client_id && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Proyecto (opcional)</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}>
                <option value="">Sin proyecto específico</option>
                {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Número de factura</label>
            <input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              placeholder="INV-2024-001" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Monto</label>
              <input required type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Moneda</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                {['USD', 'EUR', 'VES', 'COP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha de vencimiento</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Descripción</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {mutation.isPending ? 'Creando...' : 'Crear factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminInvoices() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api.get('/invoices/').then(r => r.data),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects/').then(r => r.data),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => api.put(`/invoices/${id}`, { status: 'paid', paid_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries(['admin-invoices']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries(['admin-invoices']),
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const filtered = invoices.filter(i =>
    i.number.toLowerCase().includes(search.toLowerCase()) ||
    (clientMap[i.client_id] || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = filtered.filter(i => i.status === 'pending').reduce((a, i) => a + i.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {showCreate && <CreateInvoiceModal clients={clients} projects={projects} onClose={() => setShowCreate(false)} />}

      {totalPending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-amber-800">
            Total pendiente: <span className="text-lg">${totalPending.toFixed(2)} USD</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar factura o cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" /> Nueva factura
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Cargando facturas...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400"><p className="text-sm">Sin facturas aún</p></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Factura</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Monto</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Vence</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{inv.number}</td>
                  <td className="px-6 py-4 text-gray-500">{clientMap[inv.client_id] || '—'}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">${inv.amount.toFixed(2)} {inv.currency}</td>
                  <td className="px-6 py-4 text-gray-400">{inv.due_date || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[inv.status] || ''}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status === 'pending' && (
                        <button onClick={() => markPaidMutation.mutate(inv.id)}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-50 transition-colors">
                          Marcar pagado
                        </button>
                      )}
                      {inv.pdf_url && (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => { if (confirm(`¿Eliminar factura ${inv.number}?`)) deleteMutation.mutate(inv.id); }}
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
