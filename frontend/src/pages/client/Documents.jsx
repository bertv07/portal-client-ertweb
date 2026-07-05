import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, CheckCircle2, AlertCircle, Clock, Trash2, ShieldAlert } from 'lucide-react';
import api from '../../lib/axios';

const STATUS_COLORS = {
  pending: 'text-amber-600 bg-amber-50 border-amber-100',
  review: 'text-blue-600 bg-blue-50 border-blue-100',
  approved: 'text-green-600 bg-green-50 border-green-100',
  rejected: 'text-red-600 bg-red-50 border-red-100',
};

const STATUS_LABELS = {
  pending: 'Pendiente de subir',
  review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export default function Documents() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const generalFileInputRef = useRef(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [generalDocName, setGeneralDocName] = useState('');

  // Fetch real client documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => api.get('/documents/me').then(r => r.data),
  });

  // Mutation to upload file to a specific slot
  const uploadToSlotMutation = useMutation({
    mutationFn: ({ docId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/documents/${docId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setUploadStatus('success');
      qc.invalidateQueries(['my-documents']);
      setTimeout(() => {
        setUploadStatus('');
        setSelectedDocId(null);
      }, 2000);
    },
    onError: () => {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(''), 3000);
    },
  });

  // Mutation to upload a new general document
  const uploadGeneralMutation = useMutation({
    mutationFn: ({ file, name }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('doc_type', 'general');
      return api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setUploadStatus('success');
      setGeneralDocName('');
      qc.invalidateQueries(['my-documents']);
      setTimeout(() => setUploadStatus(''), 2000);
    },
    onError: () => {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(''), 3000);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries(['my-documents']),
  });

  const handleUploadClick = (docId) => {
    setSelectedDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && selectedDocId) {
      setUploadStatus('uploading');
      uploadToSlotMutation.mutate({ docId: selectedDocId, file });
    }
  };

  const handleGeneralFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const name = generalDocName.trim() || file.name.split('.')[0];
      setUploadStatus('uploading');
      uploadGeneralMutation.mutate({ file, name });
    }
  };

  const pendingDocs = documents.filter(d => d.status === 'pending');
  const uploadedDocs = documents.filter(d => d.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx"
      />
      <input
        type="file"
        ref={generalFileInputRef}
        onChange={handleGeneralFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx"
      />

      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mis Archivos</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Gestiona los archivos y documentos oficiales del proyecto.
        </p>

        {/* Upload Status Toast */}
        {uploadStatus && (
          <div className="mb-6 p-3 bg-brand-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 justify-center">
            {uploadStatus === 'uploading' && (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                Subiendo archivo...
              </>
            )}
            {uploadStatus === 'success' && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                ¡Archivo subido exitosamente!
              </>
            )}
            {uploadStatus === 'error' && 'Error al subir archivo. Formato no soportado o archivo excedió 10MB.'}
          </div>
        )}

        {/* Section 1: Required Document Slots */}
        {pendingDocs.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Requeridos por el administrador
            </h3>
            <div className="flex flex-col gap-3">
              {pendingDocs.map((doc) => (
                <div key={doc.id} className="border border-brand-100 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-800 truncate">{doc.name}</h4>
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5 capitalize truncate">{doc.doc_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUploadClick(doc.id)}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 shrink-0"
                  >
                    Subir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: General Upload Trigger */}
        <div className="border-2 border-dashed border-brand-200 bg-brand-50/20 rounded-[32px] p-6 text-center flex flex-col items-center justify-center mb-8">
          <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 mb-3 shadow-sm">
            <Upload className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-brand-900 text-sm mb-1">Sube un archivo general</h3>
          <p className="text-[10px] text-gray-500 mb-4">PDF, Excel, Word, imágenes hasta 10MB</p>
          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="text"
              placeholder="Nombre del archivo (opcional)"
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400"
              value={generalDocName}
              onChange={e => setGeneralDocName(e.target.value)}
            />
            <button
              onClick={() => generalFileInputRef.current?.click()}
              className="bg-brand-600 text-white font-semibold text-xs px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors shrink-0"
            >
              Seleccionar
            </button>
          </div>
        </div>

        {/* Section 3: Uploaded Files */}
        <div>
          <h3 className="font-bold text-gray-800 text-sm mb-4">Documentos subidos</h3>
          {uploadedDocs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Aún no has subido documentos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uploadedDocs.map((doc) => (
                <div key={doc.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-gray-50/50 flex flex-col gap-3 relative">
                  {/* Delete button */}
                  <button
                    onClick={() => { if (confirm(`¿Eliminar ${doc.name}?`)) deleteMutation.mutate(doc.id); }}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-white border border-gray-100 rounded-xl text-brand-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pr-6">
                      <h4 className="text-xs font-bold text-gray-800 truncate" title={doc.name}>{doc.name}</h4>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{doc.original_filename || 'Cargando...'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-100">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${STATUS_COLORS[doc.status] || ''}`}>
                      {STATUS_LABELS[doc.status]}
                    </span>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>

                  {doc.admin_notes && (
                    <div className="bg-red-50 text-red-600 p-2.5 rounded-xl text-[10px] font-medium flex gap-1.5 mt-1 border border-red-100">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <div>
                        <span className="font-bold">Nota del administrador:</span> {doc.admin_notes}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
