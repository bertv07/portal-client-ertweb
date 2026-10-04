import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../lib/roles';
import ertLogoWhite from '../../assets/ert-logo-white.png';

const EASE_OUT = [0.16, 1, 0.3, 1]; // expo.out

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Ya hay una sesión activa — no tiene sentido mostrar el login de nuevo.
  useEffect(() => {
    if (user) {
      navigate(homeFor(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loggedUser = await login(email, password);
      navigate(homeFor(loggedUser.role), { replace: true });
    } catch (err) {
      if (!err.response) {
        setError('No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.');
      } else if (err.response.status === 400 || err.response.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else if (err.response.status === 403) {
        setError('Esta cuenta está desactivada. Contacta al administrador.');
      } else {
        setError('Ocurrió un error inesperado. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] flex items-center justify-center px-4 py-10 font-sans">
      {/* Fondo: glow radial morado, igual espíritu que el hero de ertweb.com */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-brand-600/30 blur-[100px]" />
        <div className="absolute -bottom-32 -right-16 w-[24rem] h-[24rem] rounded-full bg-accent-500/20 blur-[110px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-sm"
      >
        {/* Marca */}
        <motion.div variants={item} className="flex flex-col items-center mb-8 text-center">
          <img src={ertLogoWhite} alt="ertweb" className="h-10 w-auto mb-5" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Portal ErtWeb</h1>
          <p className="mt-1.5 text-sm text-white/40">Diseño que piensa. Código que siente.</p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={item}
          className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[28px] p-7 shadow-2xl shadow-black/40"
        >
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-transparent border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-white/25 transition-colors focus:outline-none focus:border-brand-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-white/25 transition-colors focus:outline-none focus:border-brand-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-300 text-xs font-medium bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 transition-all duration-300 hover:bg-brand-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/40 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <motion.p variants={item} className="mt-6 text-center text-xs text-white/25">
          ErtWeb &middot; Clientes y equipo
        </motion.p>
      </motion.div>
    </div>
  );
}
