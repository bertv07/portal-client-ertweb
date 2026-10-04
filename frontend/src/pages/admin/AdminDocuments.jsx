import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Eye, FileText, Image, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/axios';
import { apiError, shortDate } from '../../lib/format';
import {
  Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, Spinner, Table, tdClass, inputClass,
} from '../../components/ui';

const STATUS = { pending: ['Por subir', 'gray'], review: ['En revisión', 'amber'], approved: ['Aprobado', 'green'], rejected: ['Rechazado', 'red'] };

function RequestDocumentModal({ clients, projects, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ client_id: '', project_id: '', name: '', doc_type: 'general' });
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (data) => api.post('/documents/required', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-docs'] }); onClose(); },
  });
  return (
    <Modal title="Solicitar documento" subtitle="El cliente lo verá como requisito pendiente y recibirá una notificación." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, project_id: form.project_id || null }); }} className="flex flex-col gap-4">
        <Field label="Cliente">
          <select required className={inputClass} value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value, project_id: '' }))}>
            <option value="">Seleccionar cliente...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {form.client_id && (
          <Field label="Proyecto (opcional)">
            <select className={inputClass} value={form.project_id} onChange={set('project_id')}>
              <option value="">Sin proyecto específico</option>
              {projects.filter((p) => p.client_id === form.client_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="¿Qué necesitas que suba?"><input required className={inputClass} placeholder="Logotipo en vectores (SVG/AI)" value={form.name} onChange={set('name')} /></Field>
        <Field label="Categoría">
          <select className={inputClass} value={form.doc_type} onChange={set('doc_type')}>
            {['general', 'identificación', 'branding', 'contrato', 'contenido', 'accesos'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <ErrorText>{mutation.isError && apiError(mutation.error)}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel="Solicitar" loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

export default function AdminDocuments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRequest, setShowRequest] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [notes, setNotes] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-docs'] });

  const { data: docs = [], isLoading } = useQuery({ queryKey: ['admin-docs'], queryFn: () => api.get('/documents/').then((r) => r.data) });
  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ['admin-projects'], queryFn: () => api.get('/projects/').then((r) => r.data) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, admin_notes }) => api.put(`/documents/${id}/status`, { status, admin_notes }),
    onSuccess: () => { refresh(); setRejecting(null); setNotes(''); },
  });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete(`/documents/${id}`), onSuccess: refresh });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const q = search.trim().toLowerCase();
  const filtered = docs
    .filter((d) => !q || d.name.toLowerCase().includes(q) || (clientMap[d.client_id] || '').toLowerCase().includes(q))
    .filter((d) => statusFilter === 'all' || d.status === statusFilter);

  return (
    <div className="flex flex-col gap-5">
      {showRequest && <RequestDocumentModal clients={clients} projects={projects} onClose={() => setShowRequest(false)} />}
      {rejecting && (
        <Modal title="Rechazar documento" subtitle={`«${rejecting.name}» — el cliente verá el motivo y podrá subirlo de nuevo.`} onClose={() => setRejecting(null)}>
          <form onSubmit={(e) => { e.preventDefault(); statusMutation.mutate({ id: rejecting.id, status: 'rejected', admin_notes: notes || null }); }} className="flex flex-col gap-4">
            <Field label="Motivo (opcional)">
              <textarea rows={3} className={`${inputClass} resize-none`} placeholder="Ej. La imagen está borrosa, súbela en mejor resolución." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <ErrorText>{statusMutation.isError && apiError(statusMutation.error)}</ErrorText>
            <ModalActions onCancel={() => setRejecting(null)} submitLabel="Rechazar" loading={statusMutation.isPending} danger />
          </form>
        </Modal>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar documento o cliente..." />
        <Button onClick={() => setShowRequest(true)}><Plus className="w-4 h-4" /> Solicitar documento</Button>
      </div>
      <div className="flex gap-1 bg-white border border-brand-100/70 p-1 rounded-full self-start overflow-x-auto max-w-full">
        {['all', 'review', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {s === 'all' ? 'Todos' : STATUS[s][0]}
          </button>
        ))}
      </div>
      <ErrorText>{(statusMutation.isError && !rejecting && apiError(statusMutation.error)) || (deleteMutation.isError && apiError(deleteMutation.error))}</ErrorText>

      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Sin documentos">Solicita un documento a un cliente o espera a que suba sus archivos.</EmptyState>
        ) : (
          <Table columns={['Documento', 'Cliente', 'Categoría', 'Estado', 'Fecha', { label: 'Acciones', right: true }]}>
            {filtered.map((doc) => (
              <tr key={doc.id} className="hover:bg-brand-50/40 transition-colors">
                <td className={tdClass}>
                  <div className="flex items-center gap-2.5">
                    {['jpg', 'jpeg', 'png', 'webp'].includes(doc.file_type)
                      ? <Image className="w-4 h-4 text-gray-400 shrink-0" />
                      : <FileText className="w-4 h-4 text-gray-400 shrink-0" />}
                    <span className="font-semibold text-gray-900 truncate max-w-[240px]" title={doc.name}>{doc.name}</span>
                  </div>
                  {doc.admin_notes && <p className="text-xs text-gray-400 mt-0.5 pl-[26px]">{doc.admin_notes}</p>}
                </td>
                <td className={`${tdClass} text-gray-600`}>{clientMap[doc.client_id] || '—'}</td>
                <td className={`${tdClass} text-gray-500 capitalize`}>{doc.doc_type}</td>
                <td className={tdClass}><Badge tone={STATUS[doc.status]?.[1]} dot>{STATUS[doc.status]?.[0] || doc.status}</Badge></td>
                <td className={`${tdClass} text-gray-500 whitespace-nowrap`}>{shortDate(doc.updated_at || doc.created_at)}</td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer" title="Ver archivo" aria-label="Ver archivo" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    {doc.status === 'review' && (
                      <>
                        <Button variant="ghost" size="icon" className="hover:!bg-emerald-50 hover:!text-emerald-600" title="Aprobar" aria-label="Aprobar"
                          onClick={() => statusMutation.mutate({ id: doc.id, status: 'approved', admin_notes: null })}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" title="Rechazar" aria-label="Rechazar" onClick={() => setRejecting(doc)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" title="Eliminar" aria-label="Eliminar documento"
                      onClick={() => { if (confirm(`¿Eliminar "${doc.name}"?`)) deleteMutation.mutate(doc.id); }}>
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
