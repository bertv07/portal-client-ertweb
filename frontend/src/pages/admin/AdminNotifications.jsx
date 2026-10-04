import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, CheckCircle2, Megaphone } from 'lucide-react';
import api from '../../lib/axios';
import { apiError } from '../../lib/format';
import { Button, Card, ErrorText, Field, inputClass } from '../../components/ui';

const TYPES = { update: 'Actualización', milestone: 'Hito del proyecto', document: 'Documento', support: 'Soporte' };
const EMPTY = { client_id: 'all', title: '', message: '', type: 'update' };

export default function AdminNotifications() {
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });

  const mutation = useMutation({
    mutationFn: async ({ client_id, ...body }) => {
      const targets = client_id === 'all' ? clients.map((c) => c.id) : [client_id];
      await Promise.all(targets.map((user_id) => api.post('/notifications/send', { user_id, ...body })));
      return targets.length;
    },
    onSuccess: () => setForm(EMPTY),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <Card className="p-6 lg:col-span-3">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Destinatario">
              <select className={inputClass} value={form.client_id} onChange={set('client_id')}>
                <option value="all">Todos los clientes ({clients.length})</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select className={inputClass} value={form.type} onChange={set('type')}>
                {Object.entries(TYPES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Título"><input required className={inputClass} value={form.title} onChange={set('title')} /></Field>
          <Field label="Mensaje"><textarea required rows={4} className={`${inputClass} resize-none`} value={form.message} onChange={set('message')} /></Field>
          <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo enviar')}</ErrorText>
          {mutation.isSuccess && (
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Aviso enviado a {mutation.data} cliente(s).
            </p>
          )}
          <Button type="submit" className="self-start" loading={mutation.isPending} disabled={clients.length === 0}><Send className="w-4 h-4" /> Enviar aviso</Button>
        </form>
      </Card>

      <Card className="p-6 lg:col-span-2 self-start">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3"><Megaphone className="w-5 h-5" /></div>
        <h2 className="font-bold text-gray-900 mb-1">Avisos a clientes</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Lo que envíes aparece en la sección Notificaciones del portal del cliente. Además, el portal ya avisa solo cuando
          creas una factura, solicitas o revisas un documento, cambias la fase de un proyecto o revisas un pago.
        </p>
      </Card>
    </div>
  );
}
