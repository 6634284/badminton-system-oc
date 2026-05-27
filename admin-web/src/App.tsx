import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import BasicLayout from './layouts/BasicLayout';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import ActivitiesPage from './pages/activities';
import MembersPage from './pages/members';
import VenuesPage from './pages/venues';

function App() {
  const { token } = useAuthStore();

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<BasicLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="venues" element={<VenuesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
