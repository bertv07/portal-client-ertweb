import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, AlertCircle, FileText, Upload, CheckCircle2 } from 'lucide-react';
import api from '../../lib/axios';

export default function Dashboard() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // Fetch real projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => api.get('/projects/me').then(r => r.data),
  });

  // Fetch documents (to extract pending required slots)
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => api.get('/documents/me').then(r => r.data),
  });

  // Mutation to upload file to a slot
  const uploadMutation = useMutation({
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
    onError: (err) => {
      setUploadStatus('error');
      console.error(err);
      setTimeout(() => setUploadStatus(''), 3000);
    },
  });

  // Active project selection
  const [activeProjectIdx, setActiveProjectIdx] = useState(0);
  const activeProject = projects[activeProjectIdx];

  // Missing files = required documents for the active project that are pending
  const missingFiles = documents.filter(d => 
    d.source === 'required' && 
    d.status === 'pending' && 
    (activeProject ? d.project_id === activeProject.id : true)
  );

  const handleUploadClick = (docId) => {
    setSelectedDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && selectedDocId) {
      setUploadStatus('uploading');
      uploadMutation.mutate({ docId: selectedDocId, file });
    }
  };

  if (isLoadingProjects || isLoadingDocs) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx"
      />

      {projects.length === 0 ? (
        <div className="bg-white rounded-[32px] p-8 text-center shadow-sm border border-gray-100">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="font-bold text-gray-800 text-lg">No tienes proyectos activos</h3>
          <p className="text-sm text-gray-500 mt-1">Una vez que configuremos tu proyecto, aparecerá aquí.</p>
        </div>
      ) : (
        <>
          {/* Project selector tab if multiple projects */}
          {projects.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {projects.map((proj, idx) => (
                <button
                  key={proj.id}
                  onClick={() => setActiveProjectIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeProjectIdx === idx 
                      ? 'bg-brand-600 text-white' 
                      : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {proj.name}
                </button>
              ))}
            </div>
          )}

          {/* Main Status Card */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 relative overflow-hidden">
            {/* Header/Cover Area with Nice Gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-brand-600 to-accent-500 opacity-90" />

            <div className="relative mt-8">
              <div className="inline-block bg-white px-4 py-1.5 rounded-full text-xs font-bold text-brand-700 shadow-sm border border-brand-50 mb-6 uppercase tracking-wider">
                {activeProject.project_type === 'automation' ? 'Automatización' : 'Sitio Web'}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">{activeProject.name}</h2>
              <p className="text-xs text-gray-500 mb-6">{activeProject.description || 'Sin descripción'}</p>

              {/* Progress visualization */}
              <div className="mb-6">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-600 mb-2">
                  <span>Progreso del proyecto</span>
                  <span>{activeProject.progress_pct}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${activeProject.progress_pct}%` }}
                  />
                </div>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-50 pt-6">
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">Fase Actual</div>
                  <div className="font-bold text-gray-800 text-xs sm:text-sm">{activeProject.phase}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">Estimado</div>
                  <div className="font-bold text-gray-800 text-xs sm:text-sm">
                    {activeProject.estimated_weeks ? `${activeProject.estimated_weeks} Semanas` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">Restante</div>
                  <div className="font-bold text-brand-700 text-xs sm:text-sm">
                    {activeProject.remaining_weeks ? `${activeProject.remaining_weeks} Semanas` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Updates / Tags */}
          {activeProject.updates_tags && (
            <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Estado del proyecto</h3>
              <div className="flex flex-wrap gap-2">
                {activeProject.updates_tags.split(',').map((tag) => (
                  <span key={tag} className="bg-brand-50 text-brand-700 px-3.5 py-2 rounded-xl text-xs font-semibold">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Files (Archivos faltantes) */}
          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Requisitos pendientes
            </h3>

            {missingFiles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No tienes archivos pendientes por subir. ¡Todo listo!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missingFiles.map((doc) => (
                  <button
                    key={doc.id}
                    disabled={uploadStatus === 'uploading'}
                    onClick={() => handleUploadClick(doc.id)}
                    className="bg-brand-50 hover:bg-brand-100/70 border border-brand-100 text-brand-800 p-4 rounded-2xl flex items-center justify-between text-left transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-brand-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-gray-800 leading-tight">{doc.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{doc.doc_type}</div>
                      </div>
                    </div>
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-brand-100 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      <Upload className="w-3.5 h-3.5 text-brand-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Upload toast overlay */}
            {uploadStatus && (
              <div className="mt-4 p-3 bg-brand-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 justify-center">
                {uploadStatus === 'uploading' && (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    Subiendo archivo...
                  </>
                )}
                {uploadStatus === 'success' && (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Archivo subido con éxito. En revisión del admin.
                  </>
                )}
                {uploadStatus === 'error' && 'Error al subir el archivo.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
