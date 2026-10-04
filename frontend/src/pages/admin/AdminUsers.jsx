import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Trash2, Eye, Edit2, Wand2, CheckCircle2, Copy } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';
import { apiError, money, shortDate } from '../../lib/format';
import {
  Avatar, Badge, Button, Card, EmptyState, ErrorText, Field, Modal, ModalActions, SearchInput, Spinner, Table, Toggle, tdClass, inputClass,
} from '../../components/ui';
import { ProgressBar } from '../../components/ui/charts';

const ROLE_TONES = { admin: 'brand', seller: 'blue', client: 'gray' };
const ROLE_HELP = {
  client: 'Ve su proyecto, facturas, documentos y agenda.',
  seller: 'Atiende WhatsApp, controla la IA, mueve el pipeline y agenda citas.',
  admin: 'Acceso total: cuentas, proyectos, facturación y ventas.',
};

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

function PasswordField({ value, onChange, required, label, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          required={required} minLength={6} autoComplete="new-password"
          className={`${inputClass} font-mono`} value={value} onChange={(e) => onChange(e.target.value)}
        />
        <Button variant="outline" className="shrink-0" onClick={() => onChange(randomPassword())}><Wand2 className="w-4 h-4" /> Generar</Button>
      </div>
    </Field>
  );
}

function CredentialsCard({ user, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Portal ErtWeb\n${window.location.origin}/login\nCorreo: ${user.email}\nContraseña: ${password}`;
  return (
    <Modal title="Cuenta creada" onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
        <p className="text-sm text-gray-600"><strong className="text-gray-900">{user.name}</strong> ya puede iniciar sesión como {ROLE_LABELS[user.role].toLowerCase()}.</p>
      </div>
      <pre className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-xs text-gray-800 font-mono whitespace-pre-wrap break-all">{text}</pre>
      <p className="text-[11px] text-gray-500 mt-2">Copia estos datos ahora: la contraseña no se vuelve a mostrar.</p>
      <div className="flex gap-3 mt-5">
        <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true))}>
          <Copy className="w-4 h-4" /> {copied ? 'Copiado' : 'Copiar acceso'}
        </Button>
        <Button className="flex-1" onClick={onClose}>Listo</Button>
      </div>
    </Modal>
  );
}

function UserFormModal({ user, defaultRole, isSelf, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
    role: user?.role || defaultRole, password: '', is_active: user?.is_active ?? true,
  });
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => (user ? api.put(`/users/${user.id}`, data) : api.post('/users/', data)).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      if (user) onClose();
    },
  });

  if (!user && mutation.data) return <CredentialsCard user={mutation.data} password={form.password} onClose={onClose} />;

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, phone: form.phone || null };
    if (user && !data.password) delete data.password;
    mutation.mutate(data);
  };

  return (
    <Modal title={user ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Tipo de cuenta" hint={ROLE_HELP[form.role]}>
          <select className={inputClass} value={form.role} onChange={set('role')} disabled={isSelf}>
            {Object.entries(ROLE_LABELS).reverse().map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Field>
        <Field label="Nombre completo"><input required className={inputClass} value={form.name} onChange={set('name')} /></Field>
        <Field label="Correo"><input required type="email" className={inputClass} value={form.email} onChange={set('email')} /></Field>
        <Field label="Teléfono / WhatsApp (opcional)"><input className={inputClass} placeholder="+58 412 1234567" value={form.phone} onChange={set('phone')} /></Field>
        <PasswordField
          label={user ? 'Nueva contraseña' : 'Contraseña inicial'} required={!user}
          hint={user ? 'Déjala vacía para no cambiarla.' : 'Mínimo 6 caracteres. La persona puede cambiarla al entrar.'}
          value={form.password} onChange={(v) => setForm((p) => ({ ...p, password: v }))}
        />
        {user && !isSelf && (
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Cuenta activa</div>
              <div className="text-[11px] text-gray-500">Si la desactivas no podrá iniciar sesión, pero se conservan sus datos.</div>
            </div>
            <Toggle checked={form.is_active} label="Cuenta activa" onChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
          </div>
        )}
        <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo guardar la cuenta')}</ErrorText>
        <ModalActions onCancel={onClose} submitLabel={user ? 'Guardar cambios' : 'Crear cuenta'} loading={mutation.isPending} />
      </form>
    </Modal>
  );
}

const INVOICE_STATUS = { pending: ['Pendiente', 'amber'], paid: ['Pagada', 'green'], overdue: ['Vencida', 'red'], cancelled: ['Cancelada', 'gray'] };
const DOC_STATUS = { pending: ['Por subir', 'gray'], review: ['En revisión', 'amber'], approved: ['Aprobado', 'green'], rejected: ['Rechazado', 'red'] };

function Section({ title, count, children }) {
  return (
    <section>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{title} · {count}</h3>
      {count === 0 ? <p className="text-xs text-gray-400">Nada todavía.</p> : <div className="flex flex-col gap-2">{children}</div>}
    </section>
  );
}

function Row({ children }) {
  return <div className="flex items-center justify-between gap-3 bg-brand-50/60 rounded-2xl px-4 py-3 text-sm">{children}</div>;
}

function ClientOverviewModal({ user, onClose }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', 'overview', user.id],
    queryFn: () => api.get(`/users/${user.id}/overview`).then((r) => r.data),
  });

  return (
    <Modal title={user.name} subtitle={`${user.email}${user.phone ? ` · ${user.phone}` : ''} — lo que este cliente ve en su portal`} onClose={onClose} size="xl">
      {isLoading ? <Spinner /> : isError ? <ErrorText>{apiError(error)}</ErrorText> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto pr-1">
          <Section title="Proyectos" count={data.projects.length}>
            {data.projects.map((p) => (
              <div key={p.id} className="bg-brand-50/60 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm mb-2">
                  <span className="font-semibold text-gray-900 truncate">{p.name}</span>
                  <span className="text-xs text-gray-500 shrink-0">{p.phase} · {p.progress_pct}%</span>
                </div>
                <ProgressBar value={p.progress_pct} className="!bg-white" />
              </div>
            ))}
          </Section>
          <Section title="Facturas" count={data.invoices.length}>
            {data.invoices.map((i) => (
              <Row key={i.id}>
                <span className="font-semibold text-gray-900 truncate">{i.number}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-600 tabular-nums">{money(i.amount, i.currency)}</span>
                  <Badge tone={INVOICE_STATUS[i.status]?.[1]}>{INVOICE_STATUS[i.status]?.[0] || i.status}</Badge>
                </span>
              </Row>
            ))}
          </Section>
          <Section title="Documentos" count={data.documents.length}>
            {data.documents.map((d) => (
              <Row key={d.id}>
                {d.file_url
                  ? <a href={d.file_url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline truncate">{d.name}</a>
                  : <span className="font-semibold text-gray-900 truncate">{d.name}</span>}
                <Badge tone={DOC_STATUS[d.status]?.[1]}>{DOC_STATUS[d.status]?.[0] || d.status}</Badge>
              </Row>
            ))}
          </Section>
          <Section title="Mantenimiento" count={data.maintenance_plans.length}>
            {data.maintenance_plans.map((m) => (
              <Row key={m.id}>
                <span className="font-semibold text-gray-900 truncate">{m.plan_name}</span>
                <span className="text-xs text-gray-600 shrink-0">{money(m.price, m.currency)} · vence {shortDate(m.next_payment_date)}</span>
              </Row>
            ))}
          </Section>
          <Section title="Citas" count={data.appointments.length}>
            {data.appointments.map((a) => (
              <Row key={a.id}>
                <span className="font-semibold text-gray-900 truncate">{a.title}</span>
                <span className="text-xs text-gray-600 shrink-0">{shortDate(a.appointment_date)} · {a.time_slot}</span>
              </Row>
            ))}
          </Section>
          <Section title="Pagos reportados" count={data.manual_payments.length}>
            {data.manual_payments.map((m) => (
              <Row key={m.id}>
                <span className="font-semibold text-gray-900 tabular-nums">{money(m.amount, m.currency)}</span>
                <span className="text-xs text-gray-600 shrink-0">{m.payment_method} · {m.status}</span>
              </Row>
            ))}
          </Section>
        </div>
      )}
    </Modal>
  );
}

const TABS = [['client', 'Clientes'], ['seller', 'Vendedores'], ['admin', 'Administradores']];

export default function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [tab, setTab] = useState('client');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | { type: 'create' | 'edit' | 'view', user? }

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', 'all'],
    queryFn: () => api.get('/users/', { params: { role: 'all' } }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => u.role === tab && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  const count = (role) => users.filter((u) => u.role === role).length;

  const confirmDelete = (u) => {
    const warning = u.role === 'client'
      ? `¿Eliminar a ${u.name}?\n\nSe borran también sus proyectos, facturas, documentos, planes y citas. Esto no se puede deshacer. Si solo quieres quitarle el acceso, desactiva la cuenta.`
      : `¿Eliminar la cuenta de ${u.name}? Esto no se puede deshacer.`;
    if (confirm(warning)) deleteMutation.mutate(u.id);
  };

  return (
    <div className="flex flex-col gap-5">
      {modal?.type === 'create' && <UserFormModal defaultRole={tab} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <UserFormModal user={modal.user} isSelf={modal.user.id === me.id} onClose={() => setModal(null)} />}
      {modal?.type === 'view' && <ClientOverviewModal user={modal.user} onClose={() => setModal(null)} />}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-brand-100/70 p-1 rounded-full">
          {TABS.map(([id, label]) => (
            <button
              key={id} onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${tab === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {label} <span className="opacity-60 tabular-nums">{count(id)}</span>
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o correo..." />
        <Button onClick={() => setModal({ type: 'create' })}><Plus className="w-4 h-4" /> Nueva cuenta</Button>
      </div>
      <ErrorText>{(isError && apiError(error)) || (deleteMutation.isError && apiError(deleteMutation.error))}</ErrorText>

      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={Users} title={search ? 'Sin resultados' : `Sin ${TABS.find(([id]) => id === tab)[1].toLowerCase()} todavía`}
            action={!search && <Button variant="soft" onClick={() => setModal({ type: 'create' })}><Plus className="w-4 h-4" /> Crear cuenta</Button>}
          >
            {!search && ROLE_HELP[tab]}
          </EmptyState>
        ) : (
          <Table columns={['Cuenta', 'Teléfono', 'Tipo', 'Estado', 'Creada', { label: 'Acciones', right: true }]}>
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-brand-50/40 transition-colors">
                <td className={tdClass}>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{u.name}{u.id === me.id && <span className="text-xs text-gray-400 font-normal"> (tú)</span>}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className={`${tdClass} text-gray-500 whitespace-nowrap`}>{u.phone || '—'}</td>
                <td className={tdClass}><Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role] || u.role}</Badge></td>
                <td className={tdClass}><Badge tone={u.is_active ? 'green' : 'gray'} dot>{u.is_active ? 'Activa' : 'Desactivada'}</Badge></td>
                <td className={`${tdClass} text-gray-500 whitespace-nowrap`}>{shortDate(u.created_at)}</td>
                <td className={tdClass}>
                  <div className="flex items-center justify-end gap-1">
                    {u.role === 'client' && (
                      <Button variant="ghost" size="icon" onClick={() => setModal({ type: 'view', user: u })} aria-label="Ver portal del cliente" title="Ver lo que ve el cliente"><Eye className="w-4 h-4" /></Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setModal({ type: 'edit', user: u })} aria-label="Editar cuenta"><Edit2 className="w-4 h-4" /></Button>
                    {u.id !== me.id && (
                      <Button variant="ghost" size="icon" className="hover:!bg-red-50 hover:!text-red-600" onClick={() => confirmDelete(u)} aria-label="Eliminar cuenta"><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
