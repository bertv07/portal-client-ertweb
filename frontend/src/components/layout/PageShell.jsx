import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';

export default function PageShell() {
  return (
    <div className="min-h-screen bg-brand-50 flex">
      {/* Desktop Sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Mobile header — hidden on desktop */}
        <div className="lg:hidden">
          <Header />
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 sticky top-0 z-30">
          <div>
            {/* Page title placeholder — pages can override via portal/context if needed */}
            <h1 className="text-xl font-bold text-gray-900">Panel de Cliente</h1>
            <p className="text-xs text-gray-500 mt-0.5">Bienvenido a tu portal de proyectos</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 w-full px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 max-w-md mx-auto lg:max-w-5xl">
          <PageTransition />
        </main>

        {/* Mobile bottom nav — hidden on desktop */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
