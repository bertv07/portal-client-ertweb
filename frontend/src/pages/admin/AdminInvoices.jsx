import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, ReceiptText, FileOutput, Check } from 'lucide-react';
import api from '../../lib/axios';
import { apiError, money, shortDate } from '../../lib/format';
import {
  Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, Spinner, StatTile, Table, tdClass, inputClass,
} from '../../components/ui';

const STATUS = { pending: ['Pendiente', 'amber'], paid: ['Pagada', 'green'], overdue: ['Vencida', 'red'], cancelled: ['Cancelada', 'gray'] };

function CreateInvoiceModal({ clients, projects, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ client_id: '', project_id: '', number: '', description: '', amount: '', currency: 'USD', due_date: '' });
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => api.post('/invoices/', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-invoices'] }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      amount: parseFloat(form.amount),
      number: form.number.trim() || null,
      project_id: form.project_id || null,
      due_date: form.due_date || null,
    });
  };

  const clientProjects = projects.filter((p) => p.client_id === form.client_id);

  return (
    <Modal title="Nueva factura" subtitle="El cliente la verá en su portal y recibirá una notificación." onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Concepto"><input required className={inputClass} placeholder="Anticipo 50% — Sitio web" value={form.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto"><input required type="number" min="0.01" step="0.01" className={inputClass} value={form.amount} onChange={set('amount')} /></Field>
          <Field label="Moneda">
            <select className={inputClass} value={form.currency} onChange={set('currency')}>
              {['USD', 'EUR', 'VES', 'COP'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Vence el"><input type="date" className={inputClass} value={form.due_date} onChange={set('due_date')} /></Field>
          <Field label="Número" hint="Vacío = automático"><input className={inputClass} placeholder="INV-2026-001" value={form.number} onChange={set('number')} /></Field>
        </div>
        <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo crear la factura')}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel="Crear factura" loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

export default function AdminInvoices() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-invoices'] });

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['admin-invoices'], queryFn: () => api.get('/invoices/').then((r) => r.data) });
  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });
  const { data: projects = [] } = useQuery({ queryKey: ['admin-projects'], queryFn: () => api.get('/projects/').then((r) => r.data) });

  const markPaidMutation = useMutation({ mutationFn: (id) => api.put(`/invoices/${id}`, { status: 'paid' }), onSuccess: refresh });
  const pdfMutation = useMutation({ mutationFn: (id) => api.post(`/invoices/${id}/generate-pdf`), onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete(`/invoices/${id}`), onSuccess: refresh });
  const failed = [markPaidMutation, pdfMutation, deleteMutation].find((m) => m.isError);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const q = search.trim().toLowerCase();
  const filtered = invoices.filter((i) => !q || i.number.toLowerCase().includes(q) || (clientMap[i.client_id] || '').toLowerCase().includes(q));

  const sum = (status) => invoices.filter((i) => i.status === status).reduce((a, i) => a + i.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      {showCreate && <CreateInvoiceModal clients={clients} projects={projects} onClose={() => setShowCreate(false)} />}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile label="Por cobrar" value={money(sum('pending') + sum('overdue'))} sub={`${invoices.filter((i) => ['pending', 'overdue'].includes(i.status)).length} factura(s)`} tone="amber" />
        <StatTile label="Cobrado" value={money(sum('paid'))} sub={`${invoices.filter((i) => i.status === 'paid').length} factura(s)`} tone="green" />
        <StatTile label="Emitidas" value={invoices.length} sub="en total" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar factura o cliente..." />
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nueva factura</Button>
      </div>
      <ErrorText>{failed && apiError(failed.error)}</ErrorText>

      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={ReceiptText} title={search ? 'Sin resultados' : 'Sin facturas todavía'} />
        ) : (
          <Table columns={['Factura', 'Cliente', 'Monto', 'Vence', 'Estado', { label: 'Acciones', right: true }]}>
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-brand-50/40 transition-colors">
                <td className={tdClass}>
                  <div className="font-semibold text-gray-900">{inv.number}</div>
                  <div className="text-xs text-gray-400 max-w-[240px] truncate">{inv.description}</div>
                </td>
                <td className={`${tdClass} text-gray-600`}>{clientMap[inv.client_id] || '—'}</td>
                <td className={`${tdClass} font-semibold text-gray-900 tabular-nums whitespace-nowrap`}>{money(inv.amount, inv.currency)}</td>
                <td className={`${tdClass} text-gray-500 whitespace-nowrap`}>{shortDate(inv.due_date)}</td>
                <td className={tdClass}><Badge tone={STATUS[inv.status]?.[1]} dot>{STATUS[inv.status]?.[0] || inv.status}</Badge></td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    {(inv.status === 'pending' || inv.status === 'overdue') && (
                      <Button
                        variant="soft" size="sm" loading={markPaidMutation.isPending && markPaidMutation.variables === inv.id}
                        onClick={() => { if (confirm(`¿Marcar ${inv.number} como pagada?`)) markPaidMutation.mutate(inv.id); }}
                      >
                        <Check className="w-3.5 h-3.5" /> Pagada
                      </Button>
                    )}
                    {inv.pdf_url ? (
                      <a href={inv.pdf_url} target="_blank" rel="noreferrer" aria-label="Descargar recibo" title="Descargar recibo" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                        <Download className="w-4 h-4" />
                      </a>
                    ) : null}
                    <Button
                      variant="ghost" size="icon" title={inv.pdf_url ? 'Regenerar recibo PDF' : 'Generar recibo PDF'} aria-label="Generar recibo PDF"
                      loading={pdfMutation.isPending && pdfMutation.variables === inv.id} onClick={() => pdfMutation.mutate(inv.id)}
                    >
                      {!(pdfMutation.isPending && pdfMutation.variables === inv.id) && <FileOutput className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" aria-label="Eliminar factura"
                      onClick={() => { if (confirm(`¿Eliminar la factura ${inv.number}?`)) deleteMutation.mutate(inv.id); }}
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
