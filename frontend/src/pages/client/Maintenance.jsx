import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, CheckCircle2, Clock } from 'lucide-react';
import api from '../../lib/axios';
import { daysUntil, money, shortDate } from '../../lib/format';
import { Badge, Button, Card, CardTitle, EmptyState, Spinner } from '../../components/ui';
import PaymentModal from '../../components/payments/PaymentModal';

const parseTasks = (json) => {
  try { const t = JSON.parse(json || '[]'); return Array.isArray(t) ? t : []; } catch { return []; }
};

export default function Maintenance() {
  const qc = useQueryClient();
  const [activePlan, setActivePlan] = useState(null);

  const { data: plans = [], isLoading } = useQuery({ queryKey: ['my-maintenance-plans'], queryFn: () => api.get('/maintenance/me').then((r) => r.data) });
  const { data: payments = [] } = useQuery({ queryKey: ['my-maintenance-payments'], queryFn: () => api.get('/maintenance/me/payments').then((r) => r.data) });
  const { data: manualPayments = [] } = useQuery({ queryKey: ['my-manual-payments'], queryFn: () => api.get('/manual-payments/me').then((r) => r.data) });

  if (isLoading) return <Spinner />;

  if (plans.length === 0) {
    return (
      <Card>
        <EmptyState icon={Wrench} title="Sin plan de mantenimiento">
          Aún no tienes un plan de soporte. Si quieres que cuidemos tu sitio después de la entrega, escríbenos.
        </EmptyState>
      </Card>
    );
  }

  const inReview = new Set(manualPayments.filter((p) => p.status === 'pending' && p.plan_id).map((p) => p.plan_id));
  const refresh = () => ['my-maintenance-plans', 'my-maintenance-payments', 'my-manual-payments'].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));

  return (
    <div className="flex flex-col gap-5">
      {activePlan && (
        <PaymentModal
          title="Renovar plan" concept={activePlan.plan_name}
          amount={activePlan.price} currency={activePlan.currency}
          target={{ plan_id: activePlan.id }}
          onClose={() => setActivePlan(null)} onSuccess={refresh}
        />
      )}

      {plans.map((plan) => {
        const days = daysUntil(plan.next_payment_date);
        const tasks = parseTasks(plan.tasks_json);
        const reviewing = inReview.has(plan.id);
        const overdue = days !== null && days < 0;
        return (
          <Card key={plan.id} className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{plan.plan_name}</h2>
                  <Badge tone={plan.is_active ? 'green' : 'gray'} dot>{plan.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </div>
                {plan.description && <p className="text-sm text-gray-500 leading-relaxed">{plan.description}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {tasks.map((task) => (
                    <div key={task} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" /> {task}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-50/70 rounded-3xl p-5 md:w-72 shrink-0">
                <div className="text-xs font-semibold text-gray-500">Próximo pago</div>
                <div className="text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums mt-1">
                  {days === null ? '—' : overdue ? 'Vencido' : days === 0 ? 'Hoy' : `${days} día${days === 1 ? '' : 's'}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {plan.next_payment_date ? `${overdue ? 'Venció' : 'Vence'} el ${shortDate(plan.next_payment_date)}` : 'Sin fecha definida'}
                </div>
                <div className="flex items-baseline justify-between mt-4 pt-4 border-t border-brand-100">
                  <span className="text-xs text-gray-500">{plan.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}</span>
                  <span className="font-extrabold text-gray-900 tabular-nums">{money(plan.price, plan.currency)}</span>
                </div>
                {reviewing ? (
                  <div className="mt-4"><Badge tone="blue"><Clock className="w-3 h-3" /> Pago en verificación</Badge></div>
                ) : (
                  <Button className="w-full mt-4" onClick={() => setActivePlan(plan)}>Renovar / pagar</Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      <Card className="p-6">
        <CardTitle>Historial de pagos</CardTitle>
        {payments.length === 0 ? (
          <EmptyState title="Sin pagos registrados" />
        ) : (
          <div className="flex flex-col divide-y divide-brand-50">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.notes || 'Pago de mantenimiento'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{shortDate(p.paid_at || p.due_date)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-900 tabular-nums">{money(p.amount, p.currency)}</div>
                  <Badge tone={p.status === 'paid' ? 'green' : 'amber'} className="mt-1">{p.status === 'paid' ? 'Pagado' : 'Pendiente'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
