export const money = (amount, currency = 'USD') =>
  `$${Number(amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

export const moneyShort = (amount) =>
  `$${Number(amount || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`;

// Fechas "YYYY-MM-DD" se interpretan en hora local (new Date(str) las tomaría como UTC)
const asDate = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);

export const shortDate = (value) =>
  value ? asDate(value).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const longDate = (value) =>
  value ? asDate(value).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const daysUntil = (value) =>
  value ? Math.ceil((asDate(value) - new Date()) / 86400000) : null;

export const timeAgo = (value) => {
  if (!value) return '';
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  return shortDate(value);
};

export const clockTime = (value) =>
  value ? new Date(value).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '';

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

export const formatPhone = (phone = '') => (phone ? `+${phone}` : '');

export const apiError = (err, fallback = 'Ocurrió un error. Intenta de nuevo.') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return err?.response ? fallback : 'No se pudo conectar con el servidor.';
};

export const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM',
];
