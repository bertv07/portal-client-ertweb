// Resortes compartidos: una sola "física" para todo el portal.
// snappy  → respuesta al toque (botones, interruptores)
// smooth  → cosas que se desplazan (indicadores, tarjetas que cambian de lugar)
// overlay → lo que entra a escena (modales, menús, cajón)
export const SPRING = {
  snappy: { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 },
  smooth: { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 },
  overlay: { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 },
};

export const EASE_OUT = [0.16, 1, 0.3, 1];
