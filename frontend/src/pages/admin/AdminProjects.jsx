import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Search, Edit2, Trash2 } from 'lucide-react';
import api from '../../lib/axios';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  active: 'Activo', completed: 'Completado', paused: 'Pausado', cancelled: 'Cancelado',
};

function ProjectFormModal({ project, clients, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(project ? {
    client_id: project.client_id,
    name: project.name,
    description: project.description || '',
    project_type: project.project_type,
    status: project.status,
    phase: project.phase,
    progress_pct: project.progress_pct,
    estimated_weeks: project.estimated_weeks || '',
    remaining_weeks: project.remaining_weeks || '',
    updates_tags: project.updates_tags || '',
  } : {
    client_id: '', name: '', description: '', project_type: 'website',
    status: 'active', phase: 'Planificación', progress_pct: 0,
    estimated_weeks: '', remaining_weeks: '', updates_tags: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => project
      ? api.put(`/projects/${project.id}`, data)
      : api.post('/projects/', data),
    onSuccess: () => { qc.invalidateQueries(['admin-projects']); onClose(); },
    onError: (e) => setError(e.response?.data?.detail || 'Error'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, progress_pct: Number(form.progress_pct) };
    if (form.estimated_weeks) data.estimated_weeks = Number(form.estimated_weeks);
    if (form.remaining_weeks) data.remaining_weeks = Number(form.remaining_weeks);
    mutation.mutate(data);
  };

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
          <h2 className="text-lg font-bold text-gray-900">{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!project && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
              <select required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">Seleccionar cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
          )}
          {field('Nombre del proyecto', 'name', 'text', { required: true })}
          {field('Descripción', 'description')}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.project_type} onChange={e => setForm(p => ({ ...p, project_type: e.target.value }))}>
                {['website', 'automation', 'ecommerce', 'branding', 'other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Estado</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {['active', 'paused', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Fase</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.phase} onChange={e => setForm(p => ({ ...p, phase: e.target.value }))}>
                {['Planificación', 'Diseño', 'Desarrollo', 'QA', 'Entregado'].map(ph => <option key={ph}>{ph}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Progreso ({form.progress_pct}%)</label>
              <input type="range" min="0" max="100" className="w-full accent-brand-600 mt-2"
                value={form.progress_pct} onChange={e => setForm(p => ({ ...p, progress_pct: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Semanas estimadas', 'estimated_weeks', 'number')}
            {field('Semanas restantes', 'remaining_weeks', 'number')}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Tags de actualización (separados por coma)</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              placeholder="Diseño listo, Aprobado, En desarrollo..."
              value={form.updates_tags} onChange={e => setForm(p => ({ ...p, updates_tags: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {mutation.isPending ? 'Guardando...' : project ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProjects() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | project object

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects/').then(r => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries(['admin-projects']),
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (clientMap[p.client_id] || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {modal !== null && (
        <ProjectFormModal
          project={modal === 'create' ? null : modal}
          clients={clients}
          onClose={() => setModal(null)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar proyecto o cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" /> Nuevo proyecto
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Cargando proyectos...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">{search ? 'Sin resultados' : 'Sin proyectos aún'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Proyecto</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Fase</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Progreso</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-gray-500">{clientMap[p.client_id] || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{p.phase}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${p.progress_pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{p.progress_pct}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal(p)}
                        className="p-2 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar proyecto "${p.name}"?`)) deleteMutation.mutate(p.id); }}
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
