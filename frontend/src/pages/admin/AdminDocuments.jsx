import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Eye, FileText, Image, Search } from 'lucide-react';
import api from '../../lib/axios';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-500',
  review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  pending: 'Pendiente', review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado',
};

export default function AdminDocuments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['admin-docs'],
    queryFn: () => api.get('/documents/').then(r => r.data),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/users/').then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status, notes }) => api.put(`/documents/${id}/status`, { status, admin_notes: notes }),
    onSuccess: () => qc.invalidateQueries(['admin-docs']),
  });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  let filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (clientMap[d.client_id] || '').toLowerCase().includes(search.toLowerCase())
  );
  if (statusFilter !== 'all') filtered = filtered.filter(d => d.status === statusFilter);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar documento o cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'review', 'approved', 'rejected', 'pending'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Cargando documentos...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400"><p className="text-sm">Sin documentos</p></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Documento</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Subido</th>
                <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {['jpg', 'jpeg', 'png', 'webp'].includes(doc.file_type)
                        ? <Image className="w-4 h-4 text-blue-400 shrink-0" />
                        : <FileText className="w-4 h-4 text-red-400 shrink-0" />
                      }
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">{doc.name}</span>
                    </div>
                    {doc.admin_notes && <p className="text-xs text-gray-400 mt-0.5 pl-6">{doc.admin_notes}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{clientMap[doc.client_id] || '—'}</td>
                  <td className="px-6 py-4 text-gray-400 capitalize">{doc.doc_type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[doc.status]}`}>
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Ver archivo">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {doc.status === 'review' && (
                        <>
                          <button onClick={() => approveMutation.mutate({ id: doc.id, status: 'approved', notes: null })}
                            className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Aprobar">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => {
                            const notes = prompt('Razón del rechazo (opcional):');
                            approveMutation.mutate({ id: doc.id, status: 'rejected', notes });
                          }}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Rechazar">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
