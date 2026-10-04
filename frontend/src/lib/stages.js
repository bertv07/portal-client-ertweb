// Etapas del pipeline de ventas (mismos valores que el backend)
export const STAGES = [
  { id: 'new', label: 'Nuevo', tone: 'blue' },
  { id: 'contacted', label: 'Contactado', tone: 'brand' },
  { id: 'negotiation', label: 'Negociación', tone: 'amber' },
  { id: 'proposal', label: 'Propuesta enviada', tone: 'brand' },
  { id: 'won', label: 'Venta cerrada', tone: 'green' },
  { id: 'lost', label: 'Perdido', tone: 'gray' },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export const APPOINTMENT_STATUS = {
  scheduled: { label: 'Agendada', tone: 'blue' },
  completed: { label: 'Completada', tone: 'green' },
  cancelled: { label: 'Cancelada', tone: 'red' },
  no_show: { label: 'No asistió', tone: 'amber' },
};
