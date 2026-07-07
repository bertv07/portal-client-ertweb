import { useState } from 'react';
import { useLocation } from 'react-router';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminMobileNav from './AdminMobileNav';
import PageTransition from './PageTransition';
import { useAuth } from '../../context/AuthContext';

const pageTitles = {
  '/admin/dashboard': { title: 'Dashboard', subtitle: 'Resumen general de la agencia' },
  '/admin/clients': { title: 'Clientes', subtitle: 'Gestión de todos los clientes' },
  '/admin/projects': { title: 'Proyectos', subtitle: 'Todos los proyectos activos e históricos' },
  '/admin/invoices': { title: 'Facturación', subtitle: 'Facturas y comprobantes de pago' },
  '/admin/documents': { title: 'Documentos', subtitle: 'Archivos subidos por los clientes' },
  '/admin/maintenance': { title: 'Mantenimiento', subtitle: 'Planes de mantenimiento y pagos' },
  '/admin/appointments': { title: 'Citas', subtitle: 'Gestión de citas y reuniones' },
  '/admin/notifications': { title: 'Notificaciones', subtitle: 'Enviar notificaciones a clientes' },
};

export default function AdminShell() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Match by prefix for nested routes (e.g. /admin/clients/abc)
  const matchedKey = Object.keys(pageTitles).find(key => pathname.startsWith(key));
  const pageInfo = pageTitles[matchedKey] || { title: 'Admin', subtitle: '' };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <AdminMobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar — desktop */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white border-b border-gray-100 px-8 py-4 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageInfo.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{pageInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-sm font-semibold text-gray-800">{user?.name}</div>
              <div className="text-xs text-brand-600">Administrador</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold shadow-sm">
              {user?.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Top bar — mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{pageInfo.title}</h1>
            <p className="text-[11px] text-gray-500 truncate">{pageInfo.subtitle}</p>
          </div>
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
            className="shrink-0 p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <PageTransition />
        </main>
      </div>
    </div>
  );
}
