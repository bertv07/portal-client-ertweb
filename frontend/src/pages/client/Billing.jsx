import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Download, CheckCircle2, ReceiptText, Clock } from 'lucide-react';
import api from '../../lib/axios';
import { money, shortDate } from '../../lib/format';
import { Badge, Button, Card, CardTitle, EmptyState, Spinner } from '../../components/ui';
import PaymentModal from '../../components/payments/PaymentModal';

const STATUS = { pending: ['Pendiente', 'amber'], paid: ['Pagada', 'green'], overdue: ['Vencida', 'red'], cancelled: ['Cancelada', 'gray'] };

export default function Billing() {
  const qc = useQueryClient();
  const [activeInvoice, setActiveInvoice] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['my-invoices'], queryFn: () => api.get('/invoices/me').then((r) => r.data) });
  const { data: manualPayments = [] } = useQuery({ queryKey: ['my-manual-payments'], queryFn: () => api.get('/manual-payments/me').then((r) => r.data) });

  if (isLoading) return <Spinner />;

  // Facturas con un comprobante enviado que todavía no revisamos
  const inReview = new Set(manualPayments.filter((p) => p.status === 'pending' && p.invoice_id).map((p) => p.invoice_id));
  const rejectedNote = (id) => manualPayments.find((p) => p.invoice_id === id && p.status === 'rejected')?.admin_notes;

  const unpaid = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const payable = unpaid.filter((i) => !inReview.has(i.id));
  const totalDue = unpaid.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-invoices'] });
    qc.invalidateQueries({ queryKey: ['my-manual-payments'] });
  };

  return (
    <div className="flex flex-col gap-5">
      {activeInvoice && (
        <PaymentModal
          title="Pagar factura" concept={`Factura ${activeInvoice.number}`}
          amount={activeInvoice.amount} currency={activeInvoice.currency}
          target={{ invoice_id: activeInvoice.id }}
          onClose={() => setActiveInvoice(null)} onSuccess={refresh}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-500">Saldo pendiente</div>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight tabular-nums mt-1">{money(totalDue)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {unpaid.length === 0 ? 'No tienes facturas por pagar.' : `${unpaid.length} factura(s) por pagar${inReview.size ? ` · ${inReview.size} en verificación` : ''}`}
            </div>
          </div>
          {payable.length > 0 ? (
            <Button onClick={() => setActiveInvoice(payable[0])}><Wallet className="w-4 h-4" /> Pagar {payable[0].number}</Button>
          ) : unpaid.length === 0 ? (
            <Badge tone="green" dot>Al día con tus pagos</Badge>
          ) : (
            <Badge tone="amber" dot>Verificando tu pago</Badge>
          )}
        </Card>
        <Card className="p-6">
          <div className="text-xs font-semibold text-gray-500">Total pagado</div>
          <div className="text-2xl font-extrabold text-gray-900 tracking-tight tabular-nums mt-1">{money(totalPaid)}</div>
          <div className="text-xs text-gray-500 mt-1">{invoices.filter((i) => i.status === 'paid').length} factura(s)</div>
        </Card>
      </div>

      <Card className="p-6">
        <CardTitle>Tus facturas</CardTitle>
        {invoices.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Sin facturas todavía">Cuando emitamos una factura la verás aquí.</EmptyState>
        ) : (
          <div className="flex flex-col divide-y divide-brand-50">
            {invoices.map((inv) => {
              const reviewing = inReview.has(inv.id);
              const canPay = (inv.status === 'pending' || inv.status === 'overdue') && !reviewing;
              const note = canPay && rejectedNote(inv.id);
              return (
                <div key={inv.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{inv.number}</span>
                        {reviewing
                          ? <Badge tone="blue"><Clock className="w-3 h-3" /> Pago en verificación</Badge>
                          : <Badge tone={STATUS[inv.status]?.[1]} dot>{STATUS[inv.status]?.[0] || inv.status}</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{inv.description || 'Sin descripción'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {inv.status === 'paid' ? `Pagada el ${shortDate(inv.paid_at)}` : inv.due_date ? `Vence el ${shortDate(inv.due_date)}` : 'Sin fecha de vencimiento'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-gray-900 tabular-nums text-sm">{money(inv.amount, inv.currency)}</div>
                      <div className="flex items-center justify-end gap-1.5 mt-2">
                        {inv.pdf_url && (
                          <a href={inv.pdf_url} target="_blank" rel="noreferrer" aria-label={`Descargar recibo ${inv.number}`} className="p-2 rounded-xl text-gray-500 border border-gray-200 hover:border-brand-300 hover:text-brand-700">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {canPay && <Button size="sm" onClick={() => setActiveInvoice(inv)}>Pagar</Button>}
                      </div>
                    </div>
                  </div>
                  {note && <p className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2 mt-2">Tu comprobante anterior fue rechazado: {note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {unpaid.length === 0 && invoices.length > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5 justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Todas tus facturas están pagadas.</p>
      )}
    </div>
  );
}
