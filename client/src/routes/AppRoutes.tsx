import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { UnitsPage } from '../pages/UnitsPage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/units" replace /> : <LoginPage />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/units" element={<UnitsPage />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/units' : '/login'} replace />}
      />
    </Routes>
  );
}
