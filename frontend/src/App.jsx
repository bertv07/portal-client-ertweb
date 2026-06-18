import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import PageShell from './components/layout/PageShell';
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

// Mock Admin Page for testing redirect
const AdminDashboard = () => <div className="p-10 text-2xl font-bold text-center">Panel de Administrador (Fase de Mock)</div>;

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
              <Route path="/admin" element={<AdminDashboard />} />
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
