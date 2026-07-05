import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, FileText, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import api from '../../lib/axios';

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export default function AdminPayments() {
  const qc = useQueryClient();
  const [selectedProof, setSelectedProof] = useState(null);
  const [notesModal, setNotesModal] = useState(null); // { paymentId, status }
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch clients to map client_id to name
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  const getClientName = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    return c ? c.name : 'Cliente Desconocido';
  };

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-manual-payments'],
    queryFn: () => api.get('/manual-payments/').then(r => r.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) =>
      api.put(`/manual-payments/${id}/status`, { status, admin_notes: notes }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-manual-payments']);
      qc.invalidateQueries(['admin-invoices']);
      setNotesModal(null);
      setAdminNotes('');
    },
  });

  const handleActionClick = (paymentId, status) => {
    if (status === 'rejected') {
      setNotesModal({ paymentId, status });
    } else {
      // Direct approval or optional notes
      if (confirm('¿Estás seguro de que deseas APROBAR este pago?')) {
        updateStatusMutation.mutate({ id: paymentId, status: 'approved', notes: '' });
      }
    }
  };

  const handleNotesSubmit = (e) => {
    e.preventDefault();
    updateStatusMutation.mutate({
      id: notesModal.paymentId,
      status: notesModal.status,
      notes: adminNotes,
    });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-20 text-gray-400">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
    </div>
  );

  return (
    <div className="space-y-6 text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Pagos Manuales</h1>
          <p className="text-xs text-gray-400 mt-1">Revisa y aprueba comprobantes de transferencias manuales y Binance Pay.</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 text-center">
          <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <h3 className="font-bold text-gray-400">Sin pagos reportados</h3>
          <p className="text-xs text-gray-500 mt-1">No hay transacciones registradas para revisión.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700/80 rounded-3xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{getClientName(p.client_id)}</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs font-semibold text-gray-400 select-all">Ref: {p.transaction_ref || 'N/A'}</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>
                    Monto: <span className="font-bold text-white">${p.amount} {p.currency}</span> via{' '}
                    <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-[10px] font-bold uppercase text-amber-400 border border-amber-400/10">
                      {p.payment_method}
                    </span>
                  </div>
                  <div>
                    Destino:{' '}
                    {p.invoice_id ? (
                      <span className="text-brand-400 font-semibold">Factura (ID: {p.invoice_id})</span>
                    ) : p.plan_id ? (
                      <span className="text-teal-400 font-semibold">Mantenimiento (ID: {p.plan_id})</span>
                    ) : (
                      'General'
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Reportado el: {new Date(p.created_at).toLocaleString('es-VE')}
                  </div>
                  {p.admin_notes && (
                    <div className="flex items-start gap-1 bg-white/5 border border-white/5 rounded-xl p-2.5 mt-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[9px] uppercase font-bold text-gray-400">Nota Admin:</div>
                        <p className="text-xs text-gray-300 italic">{p.admin_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                {p.proof_url && (
                  <button
                    onClick={() => setSelectedProof(p.proof_url)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-xl text-gray-300 transition-colors border border-gray-700/50"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-brand-400" /> Ver Capture
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>

                  {p.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleActionClick(p.id, 'approved')}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/10"
                        title="Aprobar Pago"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleActionClick(p.id, 'rejected')}
                        className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md shadow-rose-600/10"
                        title="Rechazar Pago"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-3xl max-h-[90vh] bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={`http://localhost:8000${selectedProof}`}
              alt="Comprobante de pago"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Rejection / Note Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" /> Rechazar Pago
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Por favor indica el motivo del rechazo del comprobante. Esto le aparecerá al cliente.
            </p>

            <form onSubmit={handleNotesSubmit} className="space-y-4">
              <textarea
                required
                placeholder="Ej. El número de referencia no coincide con el depósito o la cantidad es incorrecta..."
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 min-h-[100px]"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNotesModal(null)}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-400 py-3 rounded-2xl text-xs font-bold transition-all border border-gray-850"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl text-xs font-bold transition-all"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
