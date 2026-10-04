import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Trash2, ExternalLink, FolderOpen } from 'lucide-react';
import api from '../../lib/axios';
import { apiError, shortDate } from '../../lib/format';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorText, Spinner, inputClass } from '../../components/ui';

const STATUS = { pending: ['Por subir', 'amber'], review: ['En revisión', 'blue'], approved: ['Aprobado', 'green'], rejected: ['Rechazado', 'red'] };
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx';

export default function Documents() {
  const qc = useQueryClient();
  const slotInputRef = useRef(null);
  const generalInputRef = useRef(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [generalName, setGeneralName] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['my-documents'] });

  const { data: documents = [], isLoading } = useQuery({ queryKey: ['my-documents'], queryFn: () => api.get('/documents/me').then((r) => r.data) });

  const upload = (url, formData) => api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

  const slotMutation = useMutation({
    mutationFn: ({ docId, file }) => { const fd = new FormData(); fd.append('file', file); return upload(`/documents/${docId}/upload`, fd); },
    onSuccess: refresh,
  });
  const generalMutation = useMutation({
    mutationFn: ({ file, name }) => {
      const fd = new FormData();
      fd.append('file', file); fd.append('name', name); fd.append('doc_type', 'general');
      return upload('/documents/upload', fd);
    },
    onSuccess: () => { setGeneralName(''); refresh(); },
  });
  const deleteMutation = useMutation({ mutationFn: (id) => api.delete(`/documents/${id}`), onSuccess: refresh });

  const failed = [slotMutation, generalMutation, deleteMutation].find((m) => m.isError);

  if (isLoading) return <Spinner />;

  // "Requeridos": lo que pidió el equipo y falta subir o hay que volver a subir
  const required = documents.filter((d) => d.status === 'pending' || (d.status === 'rejected' && d.source === 'required'));
  const others = documents.filter((d) => !required.includes(d));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <input
        type="file" ref={slotInputRef} className="hidden" accept={ACCEPT}
        onChange={(e) => { const file = e.target.files?.[0]; if (file && selectedDocId) slotMutation.mutate({ docId: selectedDocId, file }); e.target.value = ''; }}
      />
      <input
        type="file" ref={generalInputRef} className="hidden" accept={ACCEPT}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) generalMutation.mutate({ file, name: generalName.trim() || file.name.replace(/\.[^.]+$/, '') }); e.target.value = ''; }}
      />

      <div className="lg:col-span-2 flex flex-col gap-5">
        {failed && <ErrorText>{apiError(failed.error, 'No se pudo completar la acción (máx. 10 MB; PDF, imagen, Word o Excel).')}</ErrorText>}

        {required.length > 0 && (
          <Card className="p-6">
            <CardTitle action={<Badge tone="amber" dot>{required.length} pendiente(s)</Badge>}>Te pedimos estos documentos</CardTitle>
            <div className="flex flex-col gap-2.5">
              {required.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 bg-brand-50/70 rounded-2xl p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-brand-600 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{doc.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {doc.status === 'rejected' ? `Rechazado: ${doc.admin_notes || 'vuelve a subirlo'}` : <span className="capitalize">{doc.doc_type}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm" loading={slotMutation.isPending && selectedDocId === doc.id}
                    onClick={() => { setSelectedDocId(doc.id); slotMutation.reset(); slotInputRef.current?.click(); }}
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <CardTitle>Tus documentos</CardTitle>
          {others.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Aún no hay documentos">Aquí verás tus archivos, contratos y términos del proyecto.</EmptyState>
          ) : (
            <div className="flex flex-col divide-y divide-brand-50">
              {others.map((doc) => (
                <div key={doc.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate" title={doc.name}>{doc.name}</div>
                      <div className="text-xs text-gray-500 truncate">{doc.original_filename || doc.doc_type} · {shortDate(doc.updated_at)}</div>
                    </div>
                    <Badge tone={STATUS[doc.status]?.[1]} dot>{STATUS[doc.status]?.[0] || doc.status}</Badge>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer" aria-label={`Ver ${doc.name}`} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {doc.status !== 'approved' && (
                      <Button
                        variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" aria-label={`Eliminar ${doc.name}`}
                        onClick={() => { if (confirm(`¿Eliminar "${doc.name}"?`)) deleteMutation.mutate(doc.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {doc.status === 'rejected' && doc.admin_notes && (
                    <p className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2 mt-2">Motivo: {doc.admin_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 self-start">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3"><Upload className="w-5 h-5" /></div>
        <h2 className="font-bold text-gray-900">Enviar un archivo</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">Textos, imágenes, accesos o cualquier material para tu proyecto. PDF, imágenes, Word o Excel, hasta 10 MB.</p>
        <input className={inputClass} placeholder="Nombre del archivo (opcional)" value={generalName} onChange={(e) => setGeneralName(e.target.value)} />
        <Button className="w-full mt-3" loading={generalMutation.isPending} onClick={() => { generalMutation.reset(); generalInputRef.current?.click(); }}>
          Elegir archivo
        </Button>
        {generalMutation.isSuccess && <p className="text-xs font-semibold text-emerald-700 mt-3">Archivo enviado. Lo revisaremos pronto.</p>}
      </Card>
    </div>
  );
}
