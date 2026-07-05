import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Wrench, Check, AlertCircle } from 'lucide-react';
import api from '../../lib/axios';

function CreatePlanModal({ clients, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_id: '', plan_name: '', description: '', price: '',
    currency: 'USD', billing_cycle: 'annual',
    start_date: '', next_payment_date: '',
    tasks: ['Software Update', 'Security Audit', 'Backup Review'],
    newTask: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/maintenance/', data),
    onSuccess: () => { qc.invalidateQueries(['admin-maintenance']); onClose(); },
    onError: (e) => setError(e.response?.data?.detail || 'Error'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      client_id: form.client_id,
      plan_name: form.plan_name,
      description: form.description,
      price: parseFloat(form.price),
      currency: form.currency,
      billing_cycle: form.billing_cycle,
      start_date: form.start_date || null,
      next_payment_date: form.next_payment_date || null,
      tasks_json: JSON.stringify(form.tasks),
    };
    mutation.mutate(data);
  };

  const addTask = () => {
    if (form.newTask.trim()) {
      setForm(p => ({ ...p, tasks: [...p.tasks, p.newTask.trim()], newTask: '' }));
    }
  };

  const removeTask = (i) => {
    setForm(p => ({ ...p, tasks: p.tasks.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Nuevo Plan de Mantenimiento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
            <select required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre del plan</label>
            <input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
              placeholder="Plan Anual Premium" value={form.plan_name} onChange={e => setForm(p => ({ ...p, plan_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Precio</label>
              <input required type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Ciclo</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.billing_cycle} onChange={e => setForm(p => ({ ...p, billing_cycle: e.target.value }))}>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha inicio</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Próximo pago</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={form.next_payment_date} onChange={e => setForm(p => ({ ...p, next_payment_date: e.target.value }))} />
            </div>
          </div>

          {/* Tasks */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Tareas incluidas</label>
            <div className="flex flex-col gap-1.5 mb-2">
              {form.tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span className="text-sm flex-1">{task}</span>
                  <button type="button" onClick={() => removeTask(i)} className="text-gray-300 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                placeholder="Agregar tarea..." value={form.newTask}
                onChange={e => setForm(p => ({ ...p, newTask: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTask())} />
              <button type="button" onClick={addTask}
                className="px-3 py-2 bg-brand-100 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-200 transition-colors">
                +
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
              {mutation.isPending ? 'Creando...' : 'Crear plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminMaintenance() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-maintenance'],
    queryFn: () => api.get('/maintenance/').then(r => r.data),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {showCreate && <CreatePlanModal clients={clients} onClose={() => setShowCreate(false)} />}

      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Cargando planes...</div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin planes de mantenimiento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(plan => {
            const tasks = plan.tasks_json ? JSON.parse(plan.tasks_json) : [];
            const daysUntil = getDaysUntil(plan.next_payment_date);
            const isUrgent = daysUntil !== null && daysUntil <= 15;

            return (
              <div key={plan.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${isUrgent ? 'border-amber-300' : 'border-gray-100'}`}>
                {isUrgent && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold mb-3">
                    <AlertCircle className="w-3.5 h-3.5" /> Vence en {daysUntil} días
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{plan.plan_name}</h3>
                    <p className="text-xs text-brand-600 mt-0.5">{clientMap[plan.client_id] || '—'}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${plan.price} {plan.currency}</div>
                    <div className="text-xs text-gray-400">{plan.billing_cycle === 'annual' ? 'anual' : 'mensual'}</div>
                  </div>
                </div>

                {plan.next_payment_date && (
                  <div className="flex items-center justify-between text-xs mb-3 bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-500">Próximo pago</span>
                    <span className="font-semibold text-gray-800">{plan.next_payment_date}</span>
                  </div>
                )}

                {tasks.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">Tareas incluidas</div>
                    <div className="flex flex-col gap-1">
                      {tasks.map((task, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <Check className="w-3 h-3 text-brand-500 shrink-0" /> {task}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {plan.is_active ? 'Activo' : 'Inactivo'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
