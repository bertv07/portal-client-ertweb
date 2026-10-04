import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, FileText, Upload, Check, ArrowUpRight, Video, Wallet, CalendarPlus, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';
import { apiError, longDate, money } from '../../lib/format';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorText, Spinner } from '../../components/ui';

const PHASES = ['Planificación', 'Diseño', 'Desarrollo', 'QA', 'Entregado'];
const TYPES = { website: 'Sitio web', automation: 'Automatización', ecommerce: 'E-commerce', branding: 'Branding', other: 'Proyecto' };
const STATUS = { active: ['En curso', 'green'], completed: ['Entregado', 'brand'], paused: ['En pausa', 'amber'], cancelled: ['Cancelado', 'red'] };

// Rayado diagonal para las fases que todavía no empiezan
const HATCH = 'repeating-linear-gradient(135deg, var(--color-brand-100) 0 2px, transparent 2px 8px)';

/** Recorrido del proyecto: una columna por fase, la actual resaltada. */
function Journey({ project }) {
  const found = PHASES.findIndex((p) => project.phase?.toLowerCase().startsWith(p.toLowerCase()));
  const current = project.status === 'completed' ? PHASES.length - 1 : found;

  // Si la fase tiene un nombre fuera de la lista no adivinamos: se muestra tal cual
  if (current === -1) {
    return <p className="text-sm text-gray-600">Fase actual: <strong className="text-gray-900">{project.phase}</strong></p>;
  }

  return (
    <ol className="flex items-end gap-2 sm:gap-3 h-52" aria-label="Fases del proyecto">
      {PHASES.map((phase, i) => {
        const done = i < current || project.status === 'completed';
        const now = i === current && project.status !== 'completed';
        return (
          <li key={phase} className="flex-1 h-full flex flex-col justify-end items-center min-w-0" aria-current={now ? 'step' : undefined}>
            <div
              className={clsx(
                'w-full rounded-2xl flex flex-col items-center justify-between py-3 transition-all',
                done && 'bg-brand-100/70 border border-brand-200',
                now && 'bg-brand-600 border border-brand-600 text-white shadow-lg shadow-brand-600/25',
                !done && !now && 'border border-dashed border-brand-200',
              )}
              style={{ height: `${36 + i * 16}%`, backgroundImage: !done && !now ? HATCH : undefined }}
            >
              {now && <span className="text-[10px] font-bold bg-gray-900 text-white rounded-full px-2 py-0.5">Ahora</span>}
              {!now && <span />}
              {done && (
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
              )}
            </div>
            <span className={clsx('text-[10px] sm:text-xs mt-2 truncate max-w-full', now ? 'font-bold text-brand-700' : 'font-medium text-gray-500')}>{phase}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['my-projects'], queryFn: () => api.get('/projects/me').then((r) => r.data) });
  const { data: documents = [] } = useQuery({ queryKey: ['my-documents'], queryFn: () => api.get('/documents/me').then((r) => r.data) });
  const { data: invoices = [] } = useQuery({ queryKey: ['my-invoices'], queryFn: () => api.get('/invoices/me').then((r) => r.data) });
  const { data: appointments = [] } = useQuery({ queryKey: ['my-appointments'], queryFn: () => api.get('/appointments/me').then((r) => r.data) });

  const uploadMutation = useMutation({
    mutationFn: ({ docId, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/documents/${docId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-documents'] }),
  });

  if (isLoading) return <Spinner />;

  const project = projects.find((p) => p.id === activeProjectId) || projects[0];
  const today = new Date().toLocaleDateString('en-CA');
  const pendingDocs = documents.filter((d) => d.status === 'pending' || d.status === 'rejected');
  const unpaid = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const nextMeeting = appointments
    .filter((a) => a.status === 'scheduled' && a.appointment_date >= today)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];
  const tags = (project?.updates_tags || '').split(',').map((t) => t.trim()).filter(Boolean);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && selectedDocId) uploadMutation.mutate({ docId: selectedDocId, file });
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx" />

      {/* Proyecto */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {!project ? (
          <Card>
            <EmptyState icon={FolderKanban} title="Tu proyecto aparecerá aquí">
              Estamos preparando todo. En cuanto lo configuremos podrás seguir su avance desde esta pantalla.
            </EmptyState>
          </Card>
        ) : (
          <Card className="p-6">
            {projects.length > 1 && (
              <div className="flex gap-1 bg-brand-50 p-1 rounded-full mb-5 overflow-x-auto self-start max-w-full w-fit">
                {projects.map((p) => (
                  <button
                    key={p.id} onClick={() => setActiveProjectId(p.id)}
                    className={clsx('px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors', p.id === project.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900')}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-500">{TYPES[project.project_type] || 'Proyecto'}</div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{project.name}</h2>
              </div>
              <Badge tone={STATUS[project.status]?.[1]} dot>{STATUS[project.status]?.[0] || project.status}</Badge>
            </div>
            {project.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-2xl">{project.description}</p>}

            <div className="flex items-baseline gap-3 flex-wrap mt-6 mb-6">
              <span className="text-5xl font-extrabold text-gray-900 tracking-tight tabular-nums">{project.progress_pct}%</span>
              <span className="text-sm text-gray-500">
                completado
                {project.remaining_weeks ? ` · faltan ~${project.remaining_weeks} semana${project.remaining_weeks === 1 ? '' : 's'}` : ''}
                {project.estimated_weeks ? ` de ${project.estimated_weeks}` : ''}
              </span>
            </div>

            <Journey project={project} />

            {tags.length > 0 && (
              <div className="mt-6 pt-5 border-t border-brand-50">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">Últimas novedades</div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-800 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Columna lateral */}
      <div className="flex flex-col gap-5">
        <Card className="p-6">
          <CardTitle action={pendingDocs.length + unpaid.length > 0 && <Badge tone="amber" dot>{pendingDocs.length + unpaid.length} pendiente(s)</Badge>}>
            Necesitamos de ti
          </CardTitle>
          {pendingDocs.length + unpaid.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Todo al día" className="!py-6">No tienes nada pendiente. Nosotros seguimos avanzando.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2.5">
              {uploadMutation.isError && <ErrorText>{apiError(uploadMutation.error, 'No se pudo subir el archivo (máx. 10 MB; PDF, imagen, Word o Excel).')}</ErrorText>}
              {pendingDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 bg-brand-50/70 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-xl bg-white text-brand-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{doc.name}</div>
                    <div className="text-[11px] text-gray-500 truncate">{doc.status === 'rejected' ? `Rechazado: ${doc.admin_notes || 'súbelo de nuevo'}` : 'Documento por subir'}</div>
                  </div>
                  <Button
                    size="sm" loading={uploadMutation.isPending && selectedDocId === doc.id}
                    onClick={() => { setSelectedDocId(doc.id); uploadMutation.reset(); fileInputRef.current?.click(); }}
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir
                  </Button>
                </div>
              ))}
              {unpaid.map((inv) => (
                <Link key={inv.id} to="/billing" className="flex items-center gap-3 bg-brand-50/70 hover:bg-brand-100/70 rounded-2xl p-3 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white text-brand-600 flex items-center justify-center shrink-0"><Wallet className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">Factura {inv.number}</div>
                    <div className="text-[11px] text-gray-500 tabular-nums">{money(inv.amount, inv.currency)}</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <CardTitle>Próxima reunión</CardTitle>
          {nextMeeting ? (
            <>
              <div className="text-xs text-gray-500 capitalize">{longDate(nextMeeting.appointment_date)}</div>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5">{nextMeeting.time_slot}</div>
              <div className="text-sm text-gray-600 mt-1 truncate">{nextMeeting.title}</div>
              {nextMeeting.meeting_link ? (
                <a href={nextMeeting.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-2xl px-4 py-2.5 mt-4">
                  <Video className="w-4 h-4" /> Unirse
                </a>
              ) : (
                <p className="text-[11px] text-gray-400 mt-3">El link de la videollamada aparecerá aquí.</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">No tienes reuniones agendadas.</p>
              <Link to="/schedule" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-2xl px-4 py-2.5 mt-4">
                <CalendarPlus className="w-4 h-4" /> Agendar reunión
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
