import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/useAuth';
import { AnnouncementsPage } from '../pages/AnnouncementsPage';
import { DocumentAiTestPage } from '../pages/DocumentAiTestPage';
import { LoginPage } from '../pages/LoginPage';
import { MaintenanceRequestsPage } from '../pages/MaintenanceRequestsPage';
import { ReserveTransactionsPage } from '../pages/ReserveTransactionsPage';
import { UnitDuesPage } from '../pages/UnitDuesPage';
import { UnitOwnersPage } from '../pages/UnitOwnersPage';
import { UnitsPage } from '../pages/UnitsPage';
import { UsersPage } from '../pages/UsersPage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/users" replace /> : <LoginPage />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/ai-documents" element={<DocumentAiTestPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/unit-owners" element={<UnitOwnersPage />} />
          <Route path="/unit-dues" element={<UnitDuesPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route
            path="/maintenance-requests"
            element={<MaintenanceRequestsPage />}
          />
          <Route
            path="/reserve-transactions"
            element={<ReserveTransactionsPage />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? '/users' : '/login'} replace />
        }
      />
    </Routes>
  );
}
