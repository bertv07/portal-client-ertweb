import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../lib/roles';
import { EASE_OUT } from '../../lib/motion';
import { Button, ErrorText, Field, inputClass } from '../../components/ui';
import ertLogo from '../../assets/ert-logo.png';
import ertLogoWhite from '../../assets/ert-logo-white.png';

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
    <div className="min-h-dvh grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-white">
      {/* Panel de marca: morado sólido, la frase de ertweb y nada más */}
      <aside className="hidden lg:flex flex-col justify-between bg-brand-900 text-white p-12 xl:p-16">
        <img src={ertLogoWhite} alt="ertweb" className="h-9 w-auto self-start" />
        <div>
          <p className="text-[38px] xl:text-[46px] leading-[1.08] font-extrabold tracking-tight">
            Diseño que piensa.<br />Código que siente.
          </p>
          <p className="mt-6 text-base text-brand-200 max-w-[38ch] leading-relaxed">
            Sigue el avance de tu proyecto, tus facturas y tus documentos en un solo lugar.
          </p>
        </div>
        <p className="text-sm text-brand-300">ertweb · Automatizaciones y desarrollo web</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="w-full max-w-[380px]"
        >
          <img src={ertLogo} alt="ertweb" className="h-8 w-auto mb-10 lg:hidden" />
          <h1 className="text-[28px] leading-tight font-extrabold text-gray-900 tracking-tight">Inicia sesión</h1>
          <p className="mt-2 text-[15px] text-gray-500">Entra con el correo y la contraseña que te dimos.</p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <Field label="Correo electrónico">
              <input
                ref={emailRef}
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className={`${inputClass} !h-12`}
              />
            </Field>

            <Field label="Contraseña">
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} !h-12 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1 h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </Field>

            <ErrorText>{error}</ErrorText>

            <Button type="submit" loading={isLoading} className="!h-12 mt-1 group">
              {isLoading ? 'Entrando...' : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ¿No recuerdas tu contraseña? Escríbenos y te generamos una nueva.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
