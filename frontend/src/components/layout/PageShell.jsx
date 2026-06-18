import { Outlet } from 'react-router';
import Header from './Header';
import BottomNav from './BottomNav';

export default function PageShell() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-50 mx-auto max-w-md relative pb-20 shadow-2xl">
      <Header />
      <main className="flex-1 overflow-y-auto w-full px-4 pt-4 pb-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
