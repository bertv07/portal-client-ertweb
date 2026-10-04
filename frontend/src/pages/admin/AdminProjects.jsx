import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FolderKanban } from 'lucide-react';
import api from '../../lib/axios';
import { apiError } from '../../lib/format';
import {
  Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, Spinner, Table, tdClass, inputClass,
} from '../../components/ui';
import { ProgressBar } from '../../components/ui/charts';

const STATUS = { active: ['Activo', 'green'], completed: ['Completado', 'gray'], paused: ['Pausado', 'amber'], cancelled: ['Cancelado', 'red'] };
const TYPES = { website: 'Sitio web', automation: 'Automatización', ecommerce: 'E-commerce', branding: 'Branding', other: 'Otro' };
const PHASES = ['Planificación', 'Diseño', 'Desarrollo', 'QA', 'Entregado'];

function ProjectFormModal({ project, clients, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(project ? {
    name: project.name,
    description: project.description || '',
    project_type: project.project_type,
    status: project.status,
    phase: project.phase,
    progress_pct: project.progress_pct,
    estimated_weeks: project.estimated_weeks ?? '',
    remaining_weeks: project.remaining_weeks ?? '',
    updates_tags: project.updates_tags || '',
  } : {
    client_id: '', name: '', description: '', project_type: 'website',
    status: 'active', phase: 'Planificación', progress_pct: 0,
    estimated_weeks: '', remaining_weeks: '', updates_tags: '',
  });
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => (project ? api.put(`/projects/${project.id}`, data) : api.post('/projects/', data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-projects'] }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      progress_pct: Number(form.progress_pct),
      estimated_weeks: form.estimated_weeks === '' ? null : Number(form.estimated_weeks),
      remaining_weeks: form.remaining_weeks === '' ? null : Number(form.remaining_weeks),
    });
  };

  // Una fase que no esté en la lista (p. ej. puesta por n8n) se conserva al editar
  const phases = PHASES.includes(form.phase) ? PHASES : [form.phase, ...PHASES];

  return (
    <Modal title={project ? 'Editar proyecto' : 'Nuevo proyecto'} subtitle={project && 'Al cambiar de fase el cliente recibe una notificación.'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!project && (
          <Field label="Cliente">
            <select required className={inputClass} value={form.client_id} onChange={set('client_id')}>
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </Field>
        )}
        <Field label="Nombre del proyecto"><input required className={inputClass} value={form.name} onChange={set('name')} /></Field>
        <Field label="Descripción"><textarea rows={2} className={`${inputClass} resize-none`} value={form.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className={inputClass} value={form.project_type} onChange={set('project_type')}>
              {Object.entries(TYPES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={form.status} onChange={set('status')}>
              {Object.entries(STATUS).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
          <Field label="Fase">
            <select className={inputClass} value={form.phase} onChange={set('phase')}>
              {phases.map((ph) => <option key={ph}>{ph}</option>)}
            </select>
          </Field>
          <Field label={`Progreso · ${form.progress_pct}%`}>
            <input type="range" min="0" max="100" step="5" className="w-full accent-brand-600 mt-3" value={form.progress_pct} onChange={set('progress_pct')} />
          </Field>
          <Field label="Semanas estimadas"><input type="number" min="0" className={inputClass} value={form.estimated_weeks} onChange={set('estimated_weeks')} /></Field>
          <Field label="Semanas restantes"><input type="number" min="0" className={inputClass} value={form.remaining_weeks} onChange={set('remaining_weeks')} /></Field>
        </div>
        <Field label="Novedades (separadas por coma)" hint="El cliente las ve como etiquetas en su inicio.">
          <input className={inputClass} placeholder="Diseño aprobado, Servidor configurado..." value={form.updates_tags} onChange={set('updates_tags')} />
        </Field>
        <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo guardar el proyecto')}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel={project ? 'Guardar cambios' : 'Crear proyecto'} loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

export default function AdminProjects() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | project object

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['admin-projects'], queryFn: () => api.get('/projects/').then((r) => r.data) });
  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-projects'] }),
  });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const q = search.trim().toLowerCase();
  const filtered = projects.filter((p) => !q || p.name.toLowerCase().includes(q) || (clientMap[p.client_id] || '').toLowerCase().includes(q));

  return (
    <div className="flex flex-col gap-5">
      {modal !== null && <ProjectFormModal project={modal === 'create' ? null : modal} clients={clients} onClose={() => setModal(null)} />}

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar proyecto o cliente..." />
        <Button onClick={() => setModal('create')}><Plus className="w-4 h-4" /> Nuevo proyecto</Button>
      </div>
      <ErrorText>{deleteMutation.isError && apiError(deleteMutation.error)}</ErrorText>

      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={FolderKanban} title={search ? 'Sin resultados' : 'Sin proyectos todavía'}>
            {!search && 'Crea el proyecto de un cliente para que vea su avance en el portal.'}
          </EmptyState>
        ) : (
          <Table columns={['Proyecto', 'Cliente', 'Fase', 'Progreso', 'Estado', { label: 'Acciones', right: true }]}>
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-brand-50/40 transition-colors">
                <td className={tdClass}>
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-400">{TYPES[p.project_type] || p.project_type}</div>
                </td>
                <td className={`${tdClass} text-gray-600`}>{clientMap[p.client_id] || '—'}</td>
                <td className={`${tdClass} text-gray-600`}>{p.phase}</td>
                <td className={tdClass}>
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={p.progress_pct} className="w-24" />
                    <span className="text-xs text-gray-600 tabular-nums">{p.progress_pct}%</span>
                  </div>
                </td>
                <td className={tdClass}><Badge tone={STATUS[p.status]?.[1]} dot>{STATUS[p.status]?.[0] || p.status}</Badge></td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setModal(p)} aria-label="Editar proyecto"><Edit2 className="w-4 h-4" /></Button>
                    <Button
                      variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" aria-label="Eliminar proyecto"
                      onClick={() => { if (confirm(`¿Eliminar el proyecto "${p.name}"? Sus facturas y documentos se conservan.`)) deleteMutation.mutate(p.id); }}
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
