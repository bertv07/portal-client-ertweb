import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useOutlet } from 'react-router';
import { EASE_OUT } from '../../lib/motion';

export default function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
