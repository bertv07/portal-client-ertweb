import { useEffect, useId } from 'react';
import { motion } from 'motion/react';
import { Loader2, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { initials } from '../../lib/format';
import { SPRING } from '../../lib/motion';

export function Card({ className, children, ...props }) {
  return (
    <div className={clsx('bg-white rounded-2xl border border-brand-100/80 shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action, className }) {
  return (
    <div className={clsx('flex items-center justify-between gap-3 mb-5', className)}>
      <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_1px_2px_rgb(36_16_48/0.3)]',
  dark: 'bg-gray-900 text-white hover:bg-gray-800',
  outline: 'bg-white text-gray-700 border border-gray-200 hover:border-brand-300 hover:text-brand-700',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};
const BUTTON_SIZES = {
  sm: 'text-xs h-9 px-3 rounded-lg gap-1.5',
  md: 'text-sm h-11 px-4 rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-lg',
};

// El botón cede al presionarlo y vuelve con un resorte: se siente físico
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }) {
  return (
    <motion.button
      type="button"
      disabled={disabled || loading}
      whileTap={{ scale: 0.96 }}
      transition={SPRING.snappy}
      className={clsx(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-700',
  brand: 'bg-brand-100 text-brand-700',
  green: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-sky-50 text-sky-800',
};
const DOT_TONES = {
  gray: 'bg-gray-400', brand: 'bg-brand-500', green: 'bg-emerald-500',
  amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-sky-500',
};

export function Badge({ tone = 'gray', dot, className, children }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap', BADGE_TONES[tone], className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', DOT_TONES[tone])} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md', tone = 'brand', className }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-xs', lg: 'w-14 h-14 text-base' };
  const tones = { brand: 'bg-brand-100 text-brand-700', solid: 'bg-brand-600 text-white', gray: 'bg-gray-100 text-gray-600' };
  return (
    <div aria-hidden="true" className={clsx('rounded-full flex items-center justify-center font-bold shrink-0', sizes[size], tones[tone], className)}>
      {initials(name)}
    </div>
  );
}

/** Estado de carga: filas que laten con la forma del contenido que viene. */
export function LoadingBlock({ rows = 4, className }) {
  return (
    <div role="status" aria-label="Cargando" className={clsx('flex flex-col gap-4 p-6', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 !rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton h-3" style={{ width: `${62 - i * 9}%` }} />
            <div className="skeleton h-2.5" style={{ width: `${38 - i * 4}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={clsx('text-center py-14 px-6', className)}>
      {Icon && <Icon className="w-7 h-7 text-brand-300 mx-auto mb-3" strokeWidth={1.6} />}
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {children && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, size = 'md' }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-3xl' };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
      className="fixed inset-0 bg-brand-950/45 z-[80] flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      onMouseDown={onClose}
    >
      {/* En móvil sube desde abajo como una hoja; en escritorio crece desde el centro */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING.overlay}
        className={clsx('bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full shadow-overlay sm:my-auto max-h-[92dvh] overflow-y-auto', widths[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar" className="-mr-2 -mt-2 shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export const inputClass =
  'w-full h-11 bg-white border border-gray-200 rounded-xl px-3.5 text-sm text-gray-900 placeholder-gray-500 transition-[border-color,box-shadow] duration-150 hover:border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-500';

// Para <textarea>: misma piel que el input pero con alto libre
export const textareaClass =
  'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-500 resize-none transition-[border-color,box-shadow] duration-150 hover:border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-500';

export function Field({ label, hint, children, className }) {
  return (
    <label className={clsx('block', className)}>
      <span className="text-[13px] font-semibold text-gray-700 mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-500 mt-1.5 block leading-relaxed">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }) {
  return (
    <div className={clsx('relative flex-1 min-w-[200px]', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className={clsx(inputClass, 'pl-10')}
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
        'relative w-12 h-7 rounded-full shrink-0 flex items-center px-0.5 transition-colors duration-200 disabled:opacity-50',
        checked ? 'bg-brand-600 justify-end' : 'bg-gray-300 justify-start',
      )}
    >
      {/* `layout` hace que la perilla viaje con resorte de un lado a otro */}
      <motion.span layout transition={SPRING.snappy} className="w-6 h-6 bg-white rounded-full shadow-[0_1px_3px_rgb(36_16_48/0.3)]" />
    </button>
  );
}

/**
 * Selector de pestañas / filtros. El indicador se desliza de una opción a otra
 * en lugar de saltar, así se ve de dónde vienes.
 */
export function Segmented({ options, value, onChange, className, size = 'md' }) {
  const groupId = useId();
  return (
    <div role="tablist" className={clsx('inline-flex gap-0.5 bg-white border border-brand-100/80 p-1 rounded-xl overflow-x-auto max-w-full', className)}>
      {options.map(({ id, label, count }) => {
        const active = id === value;
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={clsx(
              'relative rounded-lg font-semibold whitespace-nowrap transition-colors duration-150',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-[13px]',
              active ? 'text-white' : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {active && <motion.span layoutId={`seg-${groupId}`} transition={SPRING.smooth} className="absolute inset-0 bg-gray-900 rounded-lg" />}
            <span className="relative inline-flex items-center gap-1.5">
              {label}
              {count !== undefined && <span className={clsx('tabular-nums', active ? 'text-white/70' : 'text-gray-500')}>{count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p role="alert" className="text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{children}</p>;
}

export function ModalActions({ onCancel, submitLabel, loading, danger }) {
  return (
    <div className="flex gap-3 pt-2">
      <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
      <Button type="submit" variant={danger ? 'danger' : 'primary'} className="flex-1" loading={loading}>{submitLabel}</Button>
    </div>
  );
}

/**
 * Cifras de resumen en UNA franja con divisores: se leen como un renglón de
 * datos, no como cuatro tarjetas iguales compitiendo entre sí.
 * `tone` solo se usa cuando la cifra pide atención (amber) o es buena noticia (green).
 */
export function StatStrip({ items, className }) {
  const tones = { amber: 'text-amber-700', green: 'text-emerald-700', red: 'text-red-700' };
  return (
    <Card className={clsx('grid grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none divide-brand-100/80 max-lg:[&>*:nth-child(odd)]:border-r max-lg:[&>*:nth-child(n+3)]:border-t lg:divide-x overflow-hidden', className)}>
      {items.map((item) => (
        <div key={item.label} className="px-6 py-5 border-brand-100/80">
          <div className="text-[13px] font-medium text-gray-500">{item.label}</div>
          <div className="text-[28px] leading-9 font-extrabold text-gray-900 tracking-tight tabular-nums mt-1">{item.value ?? '—'}</div>
          {item.sub && <div className={clsx('text-xs mt-1 font-medium', tones[item.tone] || 'text-gray-500')}>{item.sub}</div>}
        </div>
      ))}
    </Card>
  );
}

export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-100/80 bg-gray-50/60">
            {columns.map((col) => (
              <th
                key={col.label || col}
                scope="col"
                className={clsx('px-6 h-11 text-xs font-semibold text-gray-500 whitespace-nowrap', col.right ? 'text-right' : 'text-left')}
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

export const tdClass = 'px-6 py-4 align-middle';
