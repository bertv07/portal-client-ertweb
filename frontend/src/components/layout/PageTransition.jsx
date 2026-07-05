import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useOutlet } from 'react-router';

const EASE_OUT = [0.16, 1, 0.3, 1]; // equivalente a expo.out de GSAP

export default function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
