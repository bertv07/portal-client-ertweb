import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Helper to get correct icon and color based on notification type
const getIconConfig = (type) => {
  switch(type) {
    case 'milestone':
      return {
        icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>,
        bg: 'bg-brand-600'
      };
    case 'document':
      return {
        icon: <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>,
        bg: 'bg-brand-100'
      };
    case 'support':
      return {
        icon: <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>,
        bg: 'bg-gray-100'
      };
    default:
      return {
        icon: <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>,
        bg: 'bg-gray-100'
      };
  }
};

// Helper to format date (simplified for now)
const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHrs = Math.round((now - date) / 3600000);
  
  if (diffHrs < 24) return `Hace ${diffHrs || 1} horas`;
  if (diffHrs < 48) return 'Ayer';
  return `Hace ${Math.round(diffHrs/24)} días`;
};

export default function Notifications() {
  
  const { data: notifs, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/v1/notifications/');
      return response.data;
    }
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="px-2 mt-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Notificaciones</h2>
        <p className="text-sm text-gray-600 mb-6">Mantente al día con el progreso de tu proyecto.</p>
        
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm">
            Error cargando notificaciones. Revisa que el backend esté corriendo.
          </div>
        )}

        {notifs && (
          <div className="flex flex-col gap-4">
            {notifs.map((n) => {
              const { icon, bg } = getIconConfig(n.type);
              return (
                <div key={n.id} className="bg-white rounded-3xl p-5 shadow-sm border border-brand-50 flex gap-4">
                  <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${bg}`}>
                    {icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {n.title}
                        {n.subtitle && <><br/><span className="text-brand-700">{n.subtitle}</span></>}
                      </h3>
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap mt-0.5">{formatTime(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">{n.message}</p>
                    {n.action_text && (
                      <button className="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        {n.action_text}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
