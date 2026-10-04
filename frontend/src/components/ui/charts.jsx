import { useState } from 'react';
import clsx from 'clsx';

/**
 * Barras verticales de una sola serie (un solo tono de marca: es magnitud, no
 * categoría). Cada barra muestra su valor al pasar el cursor o al enfocarla.
 * `highlight` marca la barra del periodo actual; el resto queda en un tono suave.
 */
export function BarChart({ data, format = (v) => v, height = 168, highlight, emptyLabel = 'Sin datos todavía' }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 0);

  if (max === 0) {
    return <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>{emptyLabel}</div>;
  }

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const isHighlight = highlight === undefined ? true : highlight === i;
          return (
            <button
              type="button"
              key={d.label}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${d.label}: ${format(d.value)}`}
              className="relative flex-1 h-full flex items-end justify-center focus:outline-none group"
            >
              {active === i && (
                <span className="absolute -top-1 -translate-y-full z-10 bg-gray-900 text-white text-[11px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none">
                  {format(d.value)}
                </span>
              )}
              <span
                className={clsx(
                  'w-full max-w-[44px] rounded-t-[4px] transition-colors',
                  isHighlight ? 'bg-brand-600' : 'bg-brand-200',
                  'group-hover:bg-brand-700 group-focus-visible:bg-brand-700',
                )}
                style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2 border-t border-gray-100 pt-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[10px] font-medium text-gray-400 truncate">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales con etiqueta y valor visibles (ranking / reparto). */
export function HBarList({ data, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-baseline justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-600">{d.label}</span>
            <span className="font-bold text-gray-900 tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 bg-brand-50 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Medidor de un solo porcentaje (semicírculo). El número va en tinta, no en el color de la serie. */
export function Gauge({ value, label, sub }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const r = 70;
  const half = Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-full max-w-[220px]" role="img" aria-label={`${label}: ${pct}%`}>
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--color-brand-100)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--color-brand-600)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * half} ${half}`}
        />
      </svg>
      <div className="-mt-12 text-center">
        <div className="text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums">{pct}%</div>
        <div className="text-xs font-semibold text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className }) {
  return (
    <div className={clsx('h-2 bg-brand-50 rounded-full overflow-hidden', className)}>
      <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </div>
  );
}
