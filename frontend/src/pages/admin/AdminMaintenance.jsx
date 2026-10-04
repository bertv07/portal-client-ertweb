import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Wrench, Check, AlertCircle, Trash2 } from 'lucide-react';
import api from '../../lib/axios';
import { apiError, daysUntil, money, shortDate } from '../../lib/format';
import { Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, Spinner, Toggle, inputClass } from '../../components/ui';

const parseTasks = (json) => {
  try { const t = JSON.parse(json || '[]'); return Array.isArray(t) ? t : []; } catch { return []; }
};

function CreatePlanModal({ clients, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_id: '', plan_name: '', description: '', price: '',
    currency: 'USD', billing_cycle: 'monthly',
    start_date: '', next_payment_date: '',
    tasks: ['Actualizaciones de software', 'Auditoría de seguridad', 'Revisión de respaldos'],
    newTask: '',
  });
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => api.post('/maintenance/', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-maintenance'] }); onClose(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      client_id: form.client_id,
      plan_name: form.plan_name,
      description: form.description,
      price: parseFloat(form.price),
      currency: form.currency,
      billing_cycle: form.billing_cycle,
      start_date: form.start_date || null,
      next_payment_date: form.next_payment_date || null,
      tasks_json: JSON.stringify(form.tasks),
    });
  };

  const addTask = () => {
    if (form.newTask.trim()) setForm((p) => ({ ...p, tasks: [...p.tasks, p.newTask.trim()], newTask: '' }));
  };

  return (
    <Modal title="Nuevo plan de mantenimiento" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Cliente">
          <select required className={inputClass} value={form.client_id} onChange={set('client_id')}>
            <option value="">Seleccionar cliente...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Nombre del plan"><input required className={inputClass} placeholder="Plan mensual de soporte" value={form.plan_name} onChange={set('plan_name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio"><input required type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={set('price')} /></Field>
          <Field label="Ciclo">
            <select className={inputClass} value={form.billing_cycle} onChange={set('billing_cycle')}>
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
          </Field>
          <Field label="Fecha de inicio"><input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="Próximo pago"><input type="date" className={inputClass} value={form.next_payment_date} onChange={set('next_payment_date')} /></Field>
        </div>

        <div>
          <span className="text-xs font-semibold text-gray-600 mb-1.5 block">Tareas incluidas</span>
          <div className="flex flex-col gap-1.5 mb-2">
            {form.tasks.map((task, i) => (
              <div key={task} className="flex items-center gap-2 bg-brand-50/70 rounded-xl px-3 py-2">
                <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="text-sm flex-1">{task}</span>
                <button type="button" aria-label={`Quitar ${task}`} onClick={() => setForm((p) => ({ ...p, tasks: p.tasks.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={inputClass} placeholder="Agregar tarea..." value={form.newTask} onChange={set('newTask')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
            />
            <Button variant="soft" className="shrink-0" onClick={addTask} aria-label="Agregar tarea"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo crear el plan')}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel="Crear plan" loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

export default function AdminMaintenance() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-maintenance'] });

  const { data: plans = [], isLoading } = useQuery({ queryKey: ['admin-maintenance'], queryFn: () => api.get('/maintenance/').then((r) => r.data) });
  const { data: clients = [] } = useQuery({ queryKey: ['admin-users', 'client'], queryFn: () => api.get('/users/').then((r) => r.data) });

  const toggleMutation = useMutation({ mutationFn: ({ id, is_active }) => api.put(`/maintenance/${id}`, { is_active }), onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete(`/maintenance/${id}`), onSuccess: refresh });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-5">
      {showCreate && <CreatePlanModal clients={clients} onClose={() => setShowCreate(false)} />}

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Nuevo plan</Button>
      </div>
      <ErrorText>{(toggleMutation.isError && apiError(toggleMutation.error)) || (deleteMutation.isError && apiError(deleteMutation.error))}</ErrorText>

      {isLoading ? <Spinner /> : plans.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="Sin planes de mantenimiento">Crea un plan recurrente para que el cliente lo vea y pueda renovarlo desde su portal.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const tasks = parseTasks(plan.tasks_json);
            const days = daysUntil(plan.next_payment_date);
            const overdue = plan.is_active && days !== null && days < 0;
            const soon = plan.is_active && days !== null && days >= 0 && days <= 15;

            return (
              <Card key={plan.id} className="p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{plan.plan_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{clientMap[plan.client_id] || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-gray-900 tabular-nums">{money(plan.price, plan.currency)}</div>
                    <div className="text-[11px] text-gray-400">{plan.billing_cycle === 'annual' ? 'al año' : 'al mes'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-brand-50/70 rounded-2xl px-4 py-3 mb-3">
                  <span className="text-gray-500">Próximo pago</span>
                  <span className="font-semibold text-gray-900">{shortDate(plan.next_payment_date)}</span>
                </div>
                {(overdue || soon) && (
                  <div className="mb-3">
                    <Badge tone={overdue ? 'red' : 'amber'}>
                      <AlertCircle className="w-3 h-3" /> {overdue ? `Vencido hace ${Math.abs(days)} día(s)` : days === 0 ? 'Vence hoy' : `Vence en ${days} día(s)`}
                    </Badge>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 flex-1">
                  {tasks.map((task) => (
                    <div key={task} className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" /> {task}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-50">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-600">
                    <Toggle checked={plan.is_active} label="Plan activo" onChange={(v) => toggleMutation.mutate({ id: plan.id, is_active: v })} />
                    {plan.is_active ? 'Activo' : 'Inactivo'}
                  </label>
                  <Button
                    variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" aria-label="Eliminar plan"
                    onClick={() => { if (confirm(`¿Eliminar el plan "${plan.plan_name}" y su historial de pagos?`)) deleteMutation.mutate(plan.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
