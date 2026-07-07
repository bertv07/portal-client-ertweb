import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import PageShell from './components/layout/PageShell';
import AdminShell from './components/layout/AdminShell';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

const queryClient = new QueryClient();

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
import AdminClients from './pages/admin/AdminClients';
import AdminProjects from './pages/admin/AdminProjects';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAppointments from './pages/admin/AdminAppointments';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Client Routes */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route path="/" element={<PageShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
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
              <Route path="/admin" element={<AdminShell />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="clients" element={<AdminClients />} />
                <Route path="projects" element={<AdminProjects />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="maintenance" element={<AdminMaintenance />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="appointments" element={<AdminAppointments />} />
                <Route path="notifications" element={<AdminNotifications />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
