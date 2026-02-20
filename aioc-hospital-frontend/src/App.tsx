import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { authService } from './services/auth';

function RequireUserAuth({ children }: { children: React.ReactNode }) {
  const token = authService.getUserToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const token = authService.getAdminToken();
  if (!token) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public login routes */}
        <Route path="/login" element={<LoginPage mode="user" />} />
        <Route path="/admin" element={<LoginPage mode="admin" />} />

        {/* Protected user dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <RequireUserAuth>
              <UserDashboard />
            </RequireUserAuth>
          }
        />

        {/* Protected admin dashboard */}
        <Route
          path="/admin/dashboard/*"
          element={
            <RequireAdminAuth>
              <AdminDashboard />
            </RequireAdminAuth>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
