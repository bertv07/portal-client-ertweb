import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlugZap, RefreshCw } from 'lucide-react';
import api from '../../lib/axios';
import { apiError } from '../../lib/format';
import { Button, Card, CardTitle, EmptyState, ErrorText, LoadingBlock, Toggle } from '../../components/ui';

// Los interruptores viven en n8n; aquí solo se leen y se cambian
const GROUPS = [
  { title: 'WhatsApp', items: [
    { key: 'ia_global', label: 'IA en todos los chats', hint: 'Si la apagas, el bot deja de responder a todos. Es el mismo interruptor de la bandeja de WhatsApp.' },
    { key: 'followup_leads', label: 'Seguimiento a leads', hint: 'Mensaje automático a las 20 horas si el lead no volvió a escribir.' },
    { key: 'formulario_web', label: 'Respuesta al formulario web', hint: 'Escribe por WhatsApp a quien llena el formulario de la página.' },
  ] },
  { title: 'Avisos', items: [
    { key: 'recordatorios_citas', label: 'Recordatorios de citas', hint: 'Aviso al cliente una hora antes de su cita.' },
    { key: 'avisos_facturas', label: 'Avisos de facturas', hint: 'Aviso al cliente cuando una factura está por vencer o ya venció.' },
    { key: 'resumen_diario', label: 'Resumen diario', hint: 'Correo de las 8 a. m. con el resumen del día.' },
  ] },
  { title: 'Instagram', items: [
    { key: 'ig_dm_palabra_clave', label: 'Privado por palabra clave', hint: 'Mensaje privado automático cuando alguien comenta una palabra clave como SISTEMA.' },
    { key: 'ig_respuestas_publicas', label: 'Respuestas públicas', hint: 'La IA responde a los dos días los comentarios sin palabra clave.' },
    { key: 'ig_dm_ia', label: 'IA en los privados', hint: 'La IA contesta los mensajes privados de Instagram.' },
  ] },
];

export default function AdminAutomation() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['automation-flags'],
    queryFn: () => api.get('/automation/flags').then((r) => r.data.flags),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (change) => api.put('/automation/flags', { flags: change }).then((r) => r.data.flags),
    // El interruptor responde al instante; si n8n falla, vuelve a su posición
    onMutate: async (change) => {
      await qc.cancelQueries({ queryKey: ['automation-flags'] });
      const previous = qc.getQueryData(['automation-flags']);
      qc.setQueryData(['automation-flags'], (old) => ({ ...old, ...change }));
      return { previous };
    },
    onError: (_err, _change, ctx) => qc.setQueryData(['automation-flags'], ctx.previous),
    onSuccess: (flags) => {
      qc.setQueryData(['automation-flags'], (old) => ({ ...old, ...flags }));
      qc.invalidateQueries({ queryKey: ['wa-settings'] });
    },
  });

  if (query.isLoading) return <Card><LoadingBlock rows={5} /></Card>;

  if (query.isError) {
    return (
      <Card>
        <EmptyState
          icon={PlugZap}
          title="No hay conexión con el bot"
          action={<Button variant="outline" size="sm" loading={query.isFetching} onClick={() => query.refetch()}><RefreshCw className="w-4 h-4" /> Reintentar</Button>}
        >
          {apiError(query.error, 'No se pudo leer el estado del bot en n8n.')}
        </EmptyState>
      </Card>
    );
  }

  const flags = query.data || {};

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo cambiar el interruptor')}</ErrorText>
      {GROUPS.map(({ title, items }) => {
        const known = items.filter(({ key }) => key in flags);
        if (known.length === 0) return null;
        return (
          <Card key={title} className="p-6">
            <CardTitle>{title}</CardTitle>
            <ul className="divide-y divide-brand-100/70">
              {known.map(({ key, label, hint }) => (
                <li key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{hint}</p>
                  </div>
                  <Toggle checked={flags[key]} label={label} onChange={(value) => mutation.mutate({ [key]: value })} />
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
      <p className="text-sm text-gray-500 leading-relaxed">
        La aprobación de precios y el fusible anti-bucle no se pueden apagar desde aquí.
      </p>
    </div>
  );
}
