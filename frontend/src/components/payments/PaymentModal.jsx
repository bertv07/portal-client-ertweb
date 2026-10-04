import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { CheckCircle2, QrCode, Landmark, ArrowLeft } from 'lucide-react';
import api from '../../lib/axios';
import { apiError, money } from '../../lib/format';
import { Button, ErrorText, Field, Modal, Spinner, inputClass } from '../ui';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

function BinanceForm({ target, amount, currency, onDone }) {
  const [transactionRef, setTransactionRef] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Los datos de la cuenta receptora vienen del backend (.env), no del código
  const { data: info, isLoading } = useQuery({
    queryKey: ['binance-info'],
    queryFn: () => api.get('/payments/binance-info').then((r) => r.data),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('payment_method', 'binance');
      formData.append('transaction_ref', transactionRef);
      Object.entries(target).forEach(([key, value]) => formData.append(key, value));
      if (file) formData.append('file', file);
      await api.post('/manual-payments/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onDone();
    } catch (err) {
      setError(apiError(err, 'No se pudo registrar el pago'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <Spinner className="!py-8" />;

  if (!info?.binance_id && !info?.binance_email) {
    return <ErrorText>El pago por Binance no está disponible en este momento. Escríbenos y te ayudamos a completar el pago.</ErrorText>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        Envía <span className="font-bold text-gray-900">{amount} USDT</span> a esta cuenta y luego reporta el pago aquí. Lo verificamos y queda registrado.
      </p>
      <div className="bg-brand-50/70 rounded-2xl p-4 border border-brand-100 flex flex-col gap-2 text-xs">
        {info.binance_id && <div className="flex justify-between gap-3"><span className="text-gray-500">Binance Pay ID</span><span className="font-bold text-gray-900 select-all">{info.binance_id}</span></div>}
        {info.binance_email && <div className="flex justify-between gap-3"><span className="text-gray-500">Correo</span><span className="font-bold text-gray-900 select-all truncate">{info.binance_email}</span></div>}
        {info.binance_name && <div className="flex justify-between gap-3"><span className="text-gray-500">Titular</span><span className="font-bold text-gray-900">{info.binance_name}</span></div>}
        <div className="flex justify-between gap-3"><span className="text-gray-500">Monto exacto</span><span className="font-bold text-gray-900">{amount} USDT</span></div>
      </div>
      <Field label="ID de transacción / TXID">
        <input required className={inputClass} placeholder="Hash o ID del pago" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
      </Field>
      <Field label="Captura del pago (opcional)" hint="Imagen o PDF, hasta 10 MB.">
        <input
          type="file" accept="image/png,image/jpeg,image/webp,.pdf"
          className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={submitting}>Reportar pago</Button>
    </form>
  );
}

/**
 * Pago de una factura o de un plan de mantenimiento.
 * `target` es { invoice_id } o { plan_id }.
 */
export default function PaymentModal({ title, concept, amount, currency = 'USD', target, onClose, onSuccess }) {
  const [method, setMethod] = useState('');
  const [done, setDone] = useState(''); // '' | 'paypal' | 'binance'
  const [error, setError] = useState('');

  const finish = (how) => {
    setDone(how);
    onSuccess?.();
  };

  const capture = async (data) => {
    try {
      await api.post('/payments/paypal/capture-order', { order_id: data.orderID, ...target });
      finish('paypal');
    } catch (err) {
      setError(apiError(err, 'No se pudo confirmar el pago. Si se debitó, escríbenos antes de reintentar.'));
    }
  };

  if (done) {
    return (
      <Modal title={done === 'paypal' ? 'Pago recibido' : 'Comprobante enviado'} onClose={onClose} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-7 h-7 text-emerald-600" /></div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {done === 'paypal'
              ? `Registramos tu pago de ${money(amount, currency)}. ¡Gracias!`
              : 'Recibimos tu comprobante. Lo verificamos y te avisamos por aquí cuando quede aprobado.'}
          </p>
          <Button className="w-full mt-5" onClick={onClose}>Listo</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} subtitle={`${concept} — ${money(amount, currency)}`} onClose={onClose}>
      {method === '' && (
        <div className="flex flex-col gap-3">
          {PAYPAL_CLIENT_ID && (
            <button onClick={() => setMethod('paypal')} className="flex items-center gap-3 border border-gray-200 hover:border-brand-300 hover:bg-brand-50/40 p-4 rounded-2xl text-left transition-colors">
              <div className="p-2.5 bg-sky-50 rounded-xl"><Landmark className="w-5 h-5 text-sky-600" /></div>
              <div>
                <div className="text-sm font-bold text-gray-900">PayPal o tarjeta</div>
                <div className="text-xs text-gray-500">Se confirma al instante</div>
              </div>
            </button>
          )}
          <button onClick={() => setMethod('binance')} className="flex items-center gap-3 border border-gray-200 hover:border-brand-300 hover:bg-brand-50/40 p-4 rounded-2xl text-left transition-colors">
            <div className="p-2.5 bg-amber-50 rounded-xl"><QrCode className="w-5 h-5 text-amber-600" /></div>
            <div>
              <div className="text-sm font-bold text-gray-900">Binance Pay (USDT)</div>
              <div className="text-xs text-gray-500">Transfieres y reportas el pago; lo verificamos nosotros</div>
            </div>
          </button>
        </div>
      )}

      {method !== '' && (
        <button onClick={() => { setMethod(''); setError(''); }} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Otros métodos
        </button>
      )}

      {method === 'paypal' && (
        <>
          <ErrorText>{error}</ErrorText>
          <div className="mt-2">
            <PayPalScriptProvider options={{ 'client-id': PAYPAL_CLIENT_ID, currency }}>
              <PayPalButtons
                style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'pay' }}
                createOrder={async () => {
                  setError('');
                  try {
                    // El monto real lo pone el servidor a partir de la factura o el plan
                    const res = await api.post('/payments/paypal/create-order', { ...target, amount, currency, description: concept });
                    return res.data.order_id;
                  } catch (err) {
                    setError(apiError(err, 'No se pudo iniciar el pago con PayPal'));
                    throw err;
                  }
                }}
                onApprove={capture}
                onError={() => setError((prev) => prev || 'Ocurrió un error con PayPal. Intenta de nuevo.')}
              />
            </PayPalScriptProvider>
          </div>
        </>
      )}

      {method === 'binance' && <BinanceForm target={target} amount={amount} currency={currency} onDone={() => finish('binance')} />}
    </Modal>
  );
}
