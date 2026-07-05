import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Wrench, CheckCircle2, AlertCircle, X, QrCode, Landmark } from 'lucide-react';
import api from '../../lib/axios';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ plan, onClose, onSuccess }) {
  const [method, setMethod] = useState('');
  const [done, setDone] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayPalApprove = async (data) => {
    try {
      await api.post('/payments/paypal/capture-order', {
        order_id: data.orderID,
        plan_id: plan.id,
      });
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
    } catch (err) {
      alert('Error al capturar el pago. Intenta de nuevo.');
      console.error(err);
    }
  };

  const handleBinanceSubmit = async (e) => {
    e.preventDefault();
    if (!transactionRef) {
      alert('Por favor introduce el número de referencia o ID de transacción.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', plan.price);
      formData.append('currency', plan.currency || 'USD');
      formData.append('payment_method', 'binance');
      formData.append('transaction_ref', transactionRef);
      formData.append('plan_id', plan.id);
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
        onSuccess();
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
      <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-50 text-gray-400">
          <X className="w-5 h-5" />
        </button>

        {done || success ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">
              {done ? '¡Plan Renovado!' : 'Comprobante Enviado'}
            </h3>
            <p className="text-xs text-gray-500 max-w-[220px] mx-auto">
              {done 
                ? 'Tu plan de mantenimiento fue renovado correctamente.' 
                : 'El administrador verificará tu pago y renovará tu plan de mantenimiento en breve.'}
            </p>
          </div>
        ) : method === '' ? (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Renovar Plan</h3>
            <p className="text-xs text-gray-500 mb-6">
              <strong>{plan.plan_name}</strong> — <strong>${plan.price} {plan.currency}</strong>
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
                  <div className="text-[10px] text-gray-400">Pago en USDT</div>
                </div>
                <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">MANUAL</span>
              </button>
            </div>
          </>
        ) : method === 'paypal' ? (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pagar con PayPal</h3>
            <p className="text-xs text-gray-500 mb-5">
              Completa el pago de mantenimiento. El plan se renovará automáticamente.
            </p>
            <PayPalScriptProvider options={{
              'client-id': PAYPAL_CLIENT_ID,
              currency: plan.currency || 'USD',
            }}>
              <PayPalButtons
                style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'pay' }}
                createOrder={async () => {
                  const res = await api.post('/payments/paypal/create-order', {
                    plan_id: plan.id,
                    amount: plan.price,
                    currency: plan.currency || 'USD',
                    description: `Renovación ${plan.plan_name} — ErtWeb`,
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
              ← Volver
            </button>
          </>
        ) : (
          // Binance manual
          <form onSubmit={handleBinanceSubmit} className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900">Reportar Pago con Binance</h3>
            <p className="text-xs text-gray-500">
              Realiza el pago de <span className="font-bold text-gray-900">${plan.price} USDT</span> a los siguientes datos:
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Binance Pay ID / UID:</span>
                <span className="font-bold text-gray-900 select-all">839401928</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monto exacto:</span>
                <span className="font-bold text-gray-900">{plan.price} USDT</span>
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
            <button type="button" onClick={() => setMethod('')} className="w-full text-xs text-gray-400 hover:text-gray-600 mt-1">
              ← Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Maintenance Page ────────────────────────────────────────────────────
export default function Maintenance() {
  const qc = useQueryClient();
  const [activePlan, setActivePlan] = useState(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['my-maintenance-plans'],
    queryFn: () => api.get('/maintenance/me').then(r => r.data),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['my-maintenance-payments'],
    queryFn: () => api.get('/maintenance/me/payments').then(r => r.data),
  });

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return 0;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
    </div>
  );

  if (plans.length === 0) return (
    <div className="bg-white rounded-[32px] p-8 text-center shadow-sm border border-gray-100 mt-4">
      <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-bounce" />
      <h3 className="font-bold text-gray-800 text-lg">Sin Plan de Mantenimiento</h3>
      <p className="text-sm text-gray-500 mt-1">Aún no tienes asignado ningún plan recurrente.</p>
    </div>
  );

  const plan = plans[0];
  const daysLeft = getDaysUntil(plan.next_payment_date);
  const tasks = plan.tasks_json ? JSON.parse(plan.tasks_json) : ['Mantenimiento General'];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10">
      {activePlan && (
        <PaymentModal
          plan={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={() => {
            qc.invalidateQueries(['my-maintenance-plans']);
            qc.invalidateQueries(['my-maintenance-payments']);
          }}
        />
      )}

      <div className="px-2 mt-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Mantenimiento de Servicio</h2>
        <p className="text-sm text-gray-600">{plan.plan_name}</p>
      </div>

      {/* Countdown Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 text-center">
        <h3 className="font-semibold text-gray-700 mb-6">Próximo Pago</h3>
        <div className="flex justify-center mb-8 relative">
          <div className="w-56 h-28 overflow-hidden relative">
            <div className="w-56 h-56 rounded-full border-[20px] border-gray-100 absolute top-0" />
            <div
              className="w-56 h-56 rounded-full border-[20px] border-brand-700 border-b-transparent border-r-transparent absolute top-0 transition-transform duration-500"
              style={{ transform: `rotate(${Math.min(daysLeft * 4, 180) - 45}deg)` }}
            />
          </div>
          <div className="absolute bottom-2 text-center">
            <span className="text-3xl font-bold text-gray-900">{daysLeft} Días</span>
          </div>
        </div>

        <div className="flex justify-between items-center px-4 mb-8">
          <div className="text-left">
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Vence el</div>
            <div className="font-bold text-gray-800">{plan.next_payment_date || '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Monto a pagar</div>
            <div className="font-bold text-brand-600 text-lg">${plan.price} {plan.currency}</div>
          </div>
        </div>

        <button
          onClick={() => setActivePlan(plan)}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all shadow-md shadow-brand-500/20"
        >
          Renovar / Pagar Ahora
        </button>
      </div>

      {/* Tasks Grid */}
      <div className="px-2">
        <h3 className="font-bold text-gray-900 mb-4 text-xs uppercase tracking-wider">Tareas incluidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tasks.map((task, i) => (
            <div key={i} className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex items-start gap-3">
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{task}</h4>
                <p className="text-[11px] text-gray-500 mt-1">Incluido en tu plan mensual.</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payments History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
          <h3 className="font-bold text-gray-800 mb-4 text-xs uppercase tracking-wider">Historial de Pagos</h3>
          <div className="flex flex-col gap-3">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-xs font-bold text-gray-800">{p.notes || 'Pago de mantenimiento'}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-VE') : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-900">${p.amount} {p.currency}</div>
                  <span className="text-[9px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full font-bold uppercase">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
