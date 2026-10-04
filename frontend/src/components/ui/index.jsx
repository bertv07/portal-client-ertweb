import { useEffect } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { initials } from '../../lib/format';

export function Card({ className, children, ...props }) {
  return (
    <div className={clsx('bg-white rounded-3xl border border-brand-100/70 shadow-[0_1px_2px_rgba(36,16,48,0.04)]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action, className }) {
  return (
    <div className={clsx('flex items-center justify-between gap-3 mb-4', className)}>
      <h2 className="text-base font-bold text-gray-900 tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  dark: 'bg-gray-900 text-white hover:bg-gray-800',
  outline: 'bg-white text-gray-700 border border-gray-200 hover:border-brand-300 hover:text-brand-700',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const BUTTON_SIZES = {
  sm: 'text-xs px-3 py-2 rounded-xl gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-2xl gap-2',
  icon: 'p-2 rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-600',
  brand: 'bg-brand-100 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-sky-50 text-sky-700',
};
const DOT_TONES = {
  gray: 'bg-gray-400', brand: 'bg-brand-500', green: 'bg-emerald-500',
  amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-sky-500',
};

export function Badge({ tone = 'gray', dot, className, children }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap', BADGE_TONES[tone], className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', DOT_TONES[tone])} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md', tone = 'brand', className }) {
  const sizes = { sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-xs', lg: 'w-12 h-12 text-sm' };
  const tones = { brand: 'bg-brand-100 text-brand-700', solid: 'bg-brand-600 text-white', gray: 'bg-gray-100 text-gray-600' };
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-bold shrink-0', sizes[size], tones[tone], className)}>
      {initials(name)}
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <div className={clsx('flex justify-center items-center py-16 text-brand-600', className)}>
      <Loader2 className="w-7 h-7 animate-spin" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={clsx('text-center py-12 px-6', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-400 flex items-center justify-center mx-auto mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      {children && <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 bg-brand-950/50 backdrop-blur-[2px] z-[80] flex items-start sm:items-center justify-center p-4 overflow-y-auto" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={clsx('bg-white rounded-3xl p-6 w-full shadow-2xl my-auto', widths[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  'w-full bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-400';

export function Field({ label, hint, children, className }) {
  return (
    <label className={clsx('block', className)}>
      <span className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-gray-400 mt-1 block">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }) {
  return (
    <div className={clsx('relative flex-1 min-w-[180px]', className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="search"
        placeholder={placeholder}
        className={clsx(inputClass, 'pl-10 rounded-full')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
        checked ? 'bg-brand-600' : 'bg-gray-300',
      )}
    >
      <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{children}</p>;
}

export function ModalActions({ onCancel, submitLabel, loading, danger }) {
  return (
    <div className="flex gap-3 pt-1">
      <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
      <Button type="submit" variant={danger ? 'danger' : 'primary'} className="flex-1" loading={loading}>{submitLabel}</Button>
    </div>
  );
}

// Número titular con su etiqueta: lo que no necesita gráfico
export function StatTile({ icon: Icon, label, value, sub, tone = 'brand', to, className }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-500', blue: 'bg-sky-50 text-sky-600',
  };
  return (
    <Card className={clsx('p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        {Icon && (
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', tones[tone])}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </div>
      <div className="text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums">{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      {to}
    </Card>
  );
}

export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-100/70">
            {columns.map((col) => (
              <th
                key={col.label || col}
                className={clsx('px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap', col.right ? 'text-right' : 'text-left')}
              >
                {col.label ?? col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-50">{children}</tbody>
      </table>
    </div>
  );
}

export const tdClass = 'px-5 py-4 align-middle';
