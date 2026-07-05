import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Wallet, Download, CheckCircle2, AlertCircle, X, QrCode, Landmark } from 'lucide-react';
import api from '../../lib/axios';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

const STATUS_COLORS = {
  pending: 'text-amber-600 bg-amber-50 border-amber-100',
  paid:    'text-green-600 bg-green-50 border-green-100',
  overdue: 'text-red-600 bg-red-50 border-red-100',
  cancelled: 'text-gray-500 bg-gray-50 border-gray-100',
};
const STATUS_LABELS = {
  pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida', cancelled: 'Cancelada',
};

// ─── Binance Info Modal ────────────────────────────────────────────────────────
function BinanceInfoModal({ invoice, onClose, onSuccess }) {
  const [transactionRef, setTransactionRef] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionRef) {
      alert('Por favor introduce el número de referencia o ID de transacción.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', invoice.amount);
      formData.append('currency', invoice.currency || 'USD');
      formData.append('payment_method', 'binance');
      formData.append('transaction_ref', transactionRef);
      formData.append('invoice_id', invoice.id);
      if (file) {
        formData.append('file', file);
      }

      await api.post('/manual-payments/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2500);
    } catch (err) {
      alert('Error al registrar el pago: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="float-right p-1.5 rounded-xl hover:bg-gray-50 text-gray-400 mb-2">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900 mb-1 clear-both">Reportar Pago con Binance</h3>
        
        {success ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">Comprobante Enviado</h4>
            <p className="text-xs text-gray-500">
              El administrador verificará tu pago y marcará la factura como pagada en breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-gray-500">
              Realiza el pago de <span className="font-bold text-gray-900">${invoice.amount} USDT</span> a los siguientes datos:
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Binance Pay ID / UID:</span>
                <span className="font-bold text-gray-900 select-all">839401928</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monto exacto:</span>
                <span className="font-bold text-gray-900">{invoice.amount} USDT</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">ID de Transacción / TXID</label>
              <input
                type="text"
                required
                placeholder="Ingresa el hash o ID del pago"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-brand-400"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Capture de Pantalla (Opcional)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                onChange={e => setFile(e.target.files[0])}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-2xl text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Confirmar Envío'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSuccess }) {
  const [method, setMethod] = useState('');   // '' | 'paypal' | 'binance'
  const [done, setDone] = useState(false);

  const handlePayPalApprove = async (data) => {
    try {
      await api.post('/payments/paypal/capture-order', {
        order_id: data.orderID,
        invoice_id: invoice.id,
      });
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
    } catch (err) {
      alert('Error al capturar el pago. Intenta de nuevo.');
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-50 text-gray-400">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">¡Pago Exitoso!</h3>
            <p className="text-xs text-gray-500 max-w-[220px] mx-auto">
              La factura {invoice.number} fue marcada como pagada. La automatización n8n fue notificada.
            </p>
          </div>
        ) : method === '' ? (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Método de Pago</h3>
            <p className="text-xs text-gray-500 mb-6">
              Factura <strong>{invoice.number}</strong> — <strong>${invoice.amount} {invoice.currency}</strong>
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMethod('paypal')}
                className="flex items-center gap-3 border border-gray-100 hover:border-blue-300 p-4 rounded-2xl text-left hover:bg-blue-50/30 transition-all"
              >
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Landmark className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">PayPal</div>
                  <div className="text-[10px] text-gray-400">Saldo PayPal o Tarjeta de crédito/débito</div>
                </div>
                <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">ACTIVO</span>
              </button>

              <button
                onClick={() => setMethod('binance')}
                className="flex items-center gap-3 border border-gray-100 hover:border-amber-300 p-4 rounded-2xl text-left hover:bg-amber-50/30 transition-all"
              >
                <div className="p-2.5 bg-amber-50 rounded-xl">
                  <QrCode className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Binance Pay</div>
                  <div className="text-[10px] text-gray-400">Pago en USDT (Tether)</div>
                </div>
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">MANUAL</span>
              </button>
            </div>
          </>
        ) : method === 'paypal' ? (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pagar con PayPal</h3>
            <p className="text-xs text-gray-500 mb-5">
              El popup de PayPal se abrirá. Puedes pagar con tu cuenta PayPal o con tarjeta de crédito/débito sin necesidad de cuenta.
            </p>
            <PayPalScriptProvider options={{
              'client-id': PAYPAL_CLIENT_ID,
              currency: invoice.currency || 'USD',
            }}>
              <PayPalButtons
                style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'pay' }}
                createOrder={async () => {
                  const res = await api.post('/payments/paypal/create-order', {
                    invoice_id: invoice.id,
                    amount: invoice.amount,
                    currency: invoice.currency || 'USD',
                    description: `Factura ${invoice.number} — ErtWeb`,
                  });
                  return res.data.order_id;
                }}
                onApprove={handlePayPalApprove}
                onError={(err) => {
                  console.error('PayPal error:', err);
                  alert('Ocurrió un error con PayPal. Intenta de nuevo.');
                }}
              />
            </PayPalScriptProvider>
            <button onClick={() => setMethod('')} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 text-center">
              ← Volver a métodos de pago
            </button>
          </>
        ) : (
          // Binance — instrucciones manuales
          <BinanceInfoModal invoice={invoice} onClose={onClose} onSuccess={onSuccess} />
        )}
      </div>
    </div>
  );
}

// ─── Main Billing Page ────────────────────────────────────────────────────────
export default function Billing() {
  const qc = useQueryClient();
  const [activeInvoice, setActiveInvoice] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get('/invoices/me').then(r => r.data),
  });

  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const totalDue = pendingInvoices.reduce((s, i) => s + i.amount, 0);

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10">
      {activeInvoice && (
        <PaymentModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
          onSuccess={() => qc.invalidateQueries(['my-invoices'])}
        />
      )}

      {/* Balance Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 mt-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Monto total pendiente</h2>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-gray-900">${totalDue.toFixed(2)}</span>
          <span className="text-sm font-semibold text-gray-500">USD</span>
        </div>
        {pendingInvoices.length > 0 ? (
          <button
            onClick={() => setActiveInvoice(pendingInvoices[0])}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all shadow-md shadow-brand-500/20"
          >
            <Wallet className="w-4 h-4" /> Pagar Factura Pendiente
          </button>
        ) : (
          <div className="w-full bg-green-50 text-green-700 text-xs font-bold py-3.5 rounded-2xl flex justify-center items-center gap-1.5 border border-green-100">
            <CheckCircle2 className="w-4 h-4" /> Al día con tus pagos
          </div>
        )}
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
        <h3 className="font-bold text-gray-800 mb-6 text-xs uppercase tracking-wider">Historial de Facturas</h3>
        {invoices.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No tienes facturas emitidas.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className={`border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm ${
                  inv.status === 'pending' ? 'bg-brand-50/20 border-brand-100' : 'border-gray-50'
                }`}
              >
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-800 text-sm mb-0.5 truncate">{inv.number}</h4>
                  <p className="text-[10px] text-gray-500 mb-2 truncate">
                    {inv.description || '—'} · <span className="font-semibold text-gray-700">${inv.amount} {inv.currency}</span>
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${STATUS_COLORS[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => setActiveInvoice(inv)}
                      className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shrink-0"
                    >
                      Pagar
                    </button>
                  )}
                  {inv.pdf_url && (
                    <a
                      href={inv.pdf_url} target="_blank" rel="noreferrer"
                      className="p-3 bg-gray-50 text-gray-400 hover:text-brand-600 rounded-xl border border-gray-100 transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment methods info */}
      <div className="bg-gray-50 border border-gray-100 rounded-[28px] p-5 flex gap-4">
        <div className="flex flex-col gap-2 text-xs text-gray-500 flex-1">
          <p className="font-bold text-gray-700">Métodos de pago disponibles:</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <strong>PayPal</strong> — Activo. Acepta tarjeta, débito o saldo PayPal.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <strong>Binance Pay</strong> — Instrucciones manuales. Integración API en proceso.
          </div>
        </div>
      </div>
    </div>
  );
}
