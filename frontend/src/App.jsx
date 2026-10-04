import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AppShell from './components/layout/AppShell';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { homeFor } from './lib/roles';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Auth Pages
import Login from './pages/auth/Login';

// Client Pages
import Dashboard from './pages/client/Dashboard';
import Documents from './pages/client/Documents';
import Notifications from './pages/client/Notifications';
import Billing from './pages/client/Billing';
import Schedule from './pages/client/Schedule';
import Maintenance from './pages/client/Maintenance';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProjects from './pages/admin/AdminProjects';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminPayments from './pages/admin/AdminPayments';

// Staff Pages (admin y vendedor)
import SellerDashboard from './pages/staff/SellerDashboard';
import WhatsAppInbox from './pages/staff/WhatsAppInbox';
import Pipeline from './pages/staff/Pipeline';
import Agenda from './pages/staff/Agenda';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRedirect />} />

            {/* Protected Client Routes */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route element={<AppShell />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="documents" element={<Documents />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="billing" element={<Billing />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="maintenance" element={<Maintenance />} />
              </Route>
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AppShell />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="clients" element={<Navigate to="/admin/users" replace />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="maintenance" element={<AdminMaintenance />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="appointments" element={<Agenda />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="whatsapp" element={<WhatsAppInbox />} />
                <Route path="pipeline" element={<Pipeline />} />
              </Route>
            </Route>

            {/* Protected Seller Routes */}
            <Route element={<ProtectedRoute allowedRoles={['seller']} />}>
              <Route path="/seller" element={<AppShell />}>
                <Route index element={<Navigate to="/seller/dashboard" replace />} />
                <Route path="dashboard" element={<SellerDashboard />} />
                <Route path="whatsapp" element={<WhatsAppInbox />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="agenda" element={<Agenda />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
