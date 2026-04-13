import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell/AppShell';
import { useAuth } from '../context/auth-provider';
import { AdminProfilePage } from '../pages/AdminProfilePage/AdminProfilePage';
import { AnnouncementsPage } from '../pages/AnnouncementsPage/AnnouncementsPage';
import { DashboardPage } from '../pages/DashboardPage/DashboardPage';
import { DocumentsPage } from '../pages/DocumentsPage/DocumentAiTestPage';
import { ExpenseCategoriesPage } from '../pages/ExpenseCategoriesPage/ExpenseCategoriesPage';
import { LoginPage } from '../pages/LoginPage';
import { MaintenanceRequestsPage } from '../pages/MaintenanceRequestsPage/MaintenanceRequestsPage';
import { MeetingsPage } from '../pages/MeetingsPage/MeetingsPage';
import { OwnerDashboardPage } from '../pages/OwnerDashboardPage/OwnerDashboardPage';
import { OwnerDocumentsPage } from '../pages/OwnerDocumentsPage/OwnerDocumentsPage';
import { OwnerDuesPage } from '../pages/OwnerDuesPage/OwnerDuesPage';
import { OwnerMaintenancePage } from '../pages/OwnerMaintenancePage/OwnerMaintenancePage';
import { OwnerProfilePage } from '../pages/OwnerProfilePage/OwnerProfilePage';
import { ReserveTransactionsPage } from '../pages/ReserveTransactionsPage/ReserveTransactionsPage';
import { UnitDuesPage } from '../pages/UnitDuesPage/UnitDuesPage';
import { UnitOwnersPage } from '../pages/UnitOwnersPage/UnitOwnersPage';
import { UnitsPage } from '../pages/UnitsPage/UnitsPage';
import { UsersPage } from '../pages/UsersPage';
import { OwnerRoute } from './OwnerRoute';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const { isAuthenticated, role } = useAuth();
  const authenticatedHome = role === 'OWNER' ? '/owner' : '/dashboard';

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
          <Route path="/owner/profile" element={<OwnerProfilePage />} />
        </Route>

        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<AdminProfilePage />} />
          <Route path="/ai-documents" element={<DocumentsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/unit-owners" element={<UnitOwnersPage />} />
          <Route path="/unit-dues" element={<UnitDuesPage />} />
          <Route path="/expense-categories" element={<ExpenseCategoriesPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/maintenance-requests" element={<MaintenanceRequestsPage />} />
          <Route path="/reserve-transactions" element={<ReserveTransactionsPage />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? authenticatedHome : '/login'} replace />}
      />
    </Routes>
  );
}
