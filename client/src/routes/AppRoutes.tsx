import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/auth-provider';
import { AnnouncementsPage } from '../pages/AnnouncementsPage';
import { DocumentAiTestPage } from '../pages/DocumentAiTestPage';
import { LoginPage } from '../pages/LoginPage';
import { MaintenanceRequestsPage } from '../pages/MaintenanceRequestsPage';
import { OwnerDashboardPage } from '../pages/OwnerDashboardPage';
import { OwnerDocumentsPage } from '../pages/OwnerDocumentsPage';
import { OwnerDuesPage } from '../pages/OwnerDuesPage';
import { OwnerMaintenancePage } from '../pages/OwnerMaintenancePage';
import { ReserveTransactionsPage } from '../pages/ReserveTransactionsPage';
import { UnitDuesPage } from '../pages/UnitDuesPage';
import { UnitOwnersPage } from '../pages/UnitOwnersPage';
import { UnitsPage } from '../pages/UnitsPage';
import { UsersPage } from '../pages/UsersPage';
import { OwnerRoute } from './OwnerRoute';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const { isAuthenticated, role } = useAuth();
  const authenticatedHome = role === 'OWNER' ? '/owner' : '/users';

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <LoginPage />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<OwnerRoute />}>
          <Route path="/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/dues" element={<OwnerDuesPage />} />
          <Route path="/owner/maintenance" element={<OwnerMaintenancePage />} />
          <Route path="/owner/documents" element={<OwnerDocumentsPage />} />
        </Route>

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
          <Navigate to={isAuthenticated ? authenticatedHome : '/login'} replace />
        }
      />
    </Routes>
  );
}
