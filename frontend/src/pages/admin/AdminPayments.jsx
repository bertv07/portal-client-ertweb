import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Image as ImageIcon, Wallet, FileText } from 'lucide-react';
import api from '../../lib/axios';
import { apiError, money } from '../../lib/format';
import { Avatar, Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, Spinner, inputClass } from '../../components/ui';

const STATUS = { pending: ['Por revisar', 'amber'], approved: ['Aprobado', 'green'], rejected: ['Rechazado', 'red'] };

export default function AdminPayments() {
  const qc = useQueryClient();
  const [proof, setProof] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('pending');

  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });
  const { data: invoices = [] } = useQuery({ queryKey: ['admin-invoices'], queryFn: () => api.get('/invoices/').then((r) => r.data) });
  const { data: plans = [] } = useQuery({ queryKey: ['admin-maintenance'], queryFn: () => api.get('/maintenance/').then((r) => r.data) });
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-manual-payments'],
    queryFn: () => api.get('/manual-payments/').then((r) => r.data),
  });

  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Cliente';
  const target = (p) => {
    if (p.invoice_id) return `Factura ${invoices.find((i) => i.id === p.invoice_id)?.number || ''}`.trim();
    if (p.plan_id) return `Mantenimiento · ${plans.find((m) => m.id === p.plan_id)?.plan_name || 'plan'}`;
    return 'Pago general';
  };

  const mutation = useMutation({
    mutationFn: ({ id, status, admin_notes }) => api.put(`/manual-payments/${id}/status`, { status, admin_notes }),
    onSuccess: () => {
      ['admin-manual-payments', 'admin-pending-payments', 'admin-invoices', 'admin-maintenance'].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
      setRejecting(null);
      setNotes('');
    },
  });

  const visible = payments.filter((p) => filter === 'all' || p.status === filter);
  const isPdf = (url) => url?.toLowerCase().endsWith('.pdf');

  if (isLoading) return <Spinner />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 bg-white border border-brand-100/70 p-1 rounded-full self-start">
        {[['pending', 'Por revisar'], ['approved', 'Aprobados'], ['rejected', 'Rechazados'], ['all', 'Todos']].map(([id, label]) => (
          <button
            key={id} onClick={() => setFilter(id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {label} <span className="opacity-60 tabular-nums">{id === 'all' ? payments.length : payments.filter((p) => p.status === id).length}</span>
          </button>
        ))}
      </div>
      <ErrorText>{mutation.isError && !rejecting && apiError(mutation.error)}</ErrorText>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title={filter === 'pending' ? 'Nada por revisar' : 'Sin pagos en esta vista'}>
            Cuando un cliente reporte un pago por Binance o transferencia, su comprobante aparecerá aquí.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {visible.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
              <Avatar name={clientName(p.client_id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{clientName(p.client_id)}</span>
                  <Badge tone={STATUS[p.status]?.[1]} dot>{STATUS[p.status]?.[0] || p.status}</Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-bold text-gray-900 tabular-nums">{money(p.amount, p.currency)}</span> · {p.payment_method} · {target(p)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Ref: <span className="select-all font-mono">{p.transaction_ref || 'N/A'}</span> · {new Date(p.created_at).toLocaleString('es-VE')}
                </div>
                {p.admin_notes && <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mt-2">Nota: {p.admin_notes}</p>}
              </div>
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {p.proof_url && (
                  isPdf(p.proof_url)
                    ? <a href={p.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:border-brand-300"><FileText className="w-4 h-4" /> Ver PDF</a>
                    : <Button variant="outline" size="sm" onClick={() => setProof(p.proof_url)}><ImageIcon className="w-4 h-4" /> Comprobante</Button>
                )}
                {p.status === 'pending' && (
                  <>
                    <Button
                      size="sm" className="!bg-emerald-600 hover:!bg-emerald-700" loading={mutation.isPending && mutation.variables?.id === p.id}
                      onClick={() => { if (confirm(`¿Aprobar el pago de ${money(p.amount, p.currency)}? ${p.invoice_id ? 'La factura quedará pagada.' : p.plan_id ? 'El plan se renovará.' : ''}`)) mutation.mutate({ id: p.id, status: 'approved', admin_notes: '' }); }}
                    >
                      <Check className="w-4 h-4" /> Aprobar
                    </Button>
                    <Button variant="outline" size="sm" className="hover:!border-red-300 hover:!text-red-600" onClick={() => setRejecting(p)}><X className="w-4 h-4" /> Rechazar</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {proof && (
        <Modal title="Comprobante de pago" onClose={() => setProof(null)} size="xl">
          <img src={proof} alt="Comprobante de pago" className="max-w-full max-h-[70vh] object-contain rounded-2xl mx-auto" />
        </Modal>
      )}

      {rejecting && (
        <Modal title="Rechazar pago" subtitle="El motivo le llega al cliente como notificación." onClose={() => setRejecting(null)}>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ id: rejecting.id, status: 'rejected', admin_notes: notes }); }} className="flex flex-col gap-4">
            <Field label="Motivo del rechazo">
              <textarea required rows={3} className={`${inputClass} resize-none`} placeholder="Ej. La referencia no coincide con el depósito o el monto es incorrecto." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <ErrorText>{mutation.isError && apiError(mutation.error)}</ErrorText>
            <ModalActions onCancel={() => setRejecting(null)} submitLabel="Confirmar rechazo" loading={mutation.isPending} danger />
          </form>
        </Modal>
      )}
    </div>
  );
}
