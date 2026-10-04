import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, FileText, Flag, LifeBuoy, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';
import { apiError, timeAgo } from '../../lib/format';
import { Card, EmptyState, ErrorText, Spinner } from '../../components/ui';

const ICONS = { milestone: Flag, document: FileText, support: LifeBuoy, update: RefreshCw };

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifs = [], isLoading, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then((r) => r.data),
  });

  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.setQueryData(['notifications-unread'], 0),
  });

  // Al abrir la página se dan por leídas (apaga el punto rojo de la campana).
  // En esta visita siguen resaltadas las que eran nuevas.
  const hasUnread = notifs.some((n) => !n.is_read);
  const { mutate: markRead } = readAll;
  useEffect(() => {
    if (hasUnread) markRead();
  }, [hasUnread, markRead]);

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorText>{apiError(error, 'No se pudieron cargar las notificaciones')}</ErrorText>;

  if (notifs.length === 0) {
    return <Card><EmptyState icon={Bell} title="Sin notificaciones">Aquí te avisaremos de avances, facturas y documentos de tu proyecto.</EmptyState></Card>;
  }

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      {notifs.map((n) => {
        const Icon = ICONS[n.type] || Bell;
        return (
          <Card key={n.id} className={clsx('p-5 flex gap-4', !n.is_read && 'border-brand-300 bg-brand-50/40')}>
            <div className={clsx('w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center', n.is_read ? 'bg-gray-100 text-gray-500' : 'bg-brand-600 text-white')}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-3">
                <h3 className="font-bold text-gray-900 text-sm leading-snug">
                  {n.title}{n.subtitle && <span className="text-brand-700"> {n.subtitle}</span>}
                </h3>
                <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo(n.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mt-1">{n.message}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
