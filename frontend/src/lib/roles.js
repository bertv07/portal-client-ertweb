export const ROLE_LABELS = { admin: 'Administrador', seller: 'Vendedor', client: 'Cliente' };

// Ruta de inicio de cada rol
export const homeFor = (role) =>
  role === 'admin' ? '/admin/dashboard' : role === 'seller' ? '/seller/dashboard' : '/dashboard';

// Prefijo de las pantallas internas (admin y vendedor comparten WhatsApp, pipeline y agenda)
export const staffBase = (role) => (role === 'admin' ? '/admin' : '/seller');
