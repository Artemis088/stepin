import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import { Spinner } from './components/ui.jsx';
import { roleHome } from './roleHome.js';

// Entry / auth
import Landing from './pages/Landing.jsx';
import RoleSelect from './pages/RoleSelect.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import StudentSignup from './pages/StudentSignup.jsx';
import CompanySignup from './pages/CompanySignup.jsx';

// Student
import Tasks from './pages/student/Tasks.jsx';
import TaskDetail from './pages/student/TaskDetail.jsx';
import Screening from './pages/student/Screening.jsx';
import Applications from './pages/student/Applications.jsx';
import Profile from './pages/student/Profile.jsx';
import Workspace from './pages/student/Workspace.jsx';
import LiveDefense from './pages/student/LiveDefense.jsx';

// Company
import Dashboard from './pages/company/Dashboard.jsx';
import PostTask from './pages/company/PostTask.jsx';
import MyTasks from './pages/company/MyTasks.jsx';
import TaskFunnel from './pages/company/TaskFunnel.jsx';
import Shortlist from './pages/company/Shortlist.jsx';
import Rate from './pages/company/Rate.jsx';
import CompanyProfile from './pages/company/CompanyProfile.jsx';

// Admin
import AdminOverview from './pages/admin/Overview.jsx';
import AdminCompanies from './pages/admin/Companies.jsx';
import AdminTasks from './pages/admin/Tasks.jsx';
import AdminTemplates from './pages/admin/Templates.jsx';
import AdminShortlist from './pages/admin/ShortlistConfig.jsx';
import AdminIncidents from './pages/admin/Incidents.jsx';

// Shared
import Notifications from './pages/Notifications.jsx';
import Agreement from './pages/Agreement.jsx';

function Protected({ role, allowGuest, children }) {
  const { user, loading, guest } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) {
    // Guests may browse the read-only student pages that opt in via allowGuest.
    if (allowGuest && guest) return <AppShell guest>{children}</AppShell>;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role && user.role !== role) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public entry */}
      <Route path="/" element={user && !loading ? <RoleHome user={user} /> : <Landing />} />
      <Route path="/get-started" element={<RoleSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/signup/student" element={<StudentSignup />} />
      <Route path="/signup/company" element={<CompanySignup />} />

      {/* Student */}
      <Route path="/student/internships" element={<Protected role="student" allowGuest><Tasks type="internship" /></Protected>} />
      <Route path="/student/tasks" element={<Protected role="student" allowGuest><Tasks type="standalone" /></Protected>} />
      <Route path="/student/tasks/:id" element={<Protected role="student" allowGuest><TaskDetail /></Protected>} />
      <Route path="/student/screening/:taskId" element={<Protected role="student"><Screening /></Protected>} />
      <Route path="/student/applications" element={<Protected role="student"><Applications /></Protected>} />
      <Route path="/student/profile" element={<Protected role="student"><Profile /></Protected>} />
      <Route path="/student/workspace/:taskId" element={<Protected role="student"><Workspace /></Protected>} />
      <Route path="/student/defense/:taskId" element={<Protected role="student"><LiveDefense /></Protected>} />
      <Route path="/student/notifications" element={<Protected role="student"><Notifications /></Protected>} />
      <Route path="/student/agreement/:id" element={<Protected role="student"><Agreement /></Protected>} />

      {/* Company */}
      <Route path="/company/dashboard" element={<Protected role="company"><Dashboard /></Protected>} />
      <Route path="/company/post" element={<Protected role="company"><PostTask /></Protected>} />
      <Route path="/company/tasks" element={<Protected role="company"><MyTasks /></Protected>} />
      <Route path="/company/tasks/:id" element={<Protected role="company"><TaskFunnel /></Protected>} />
      <Route path="/company/shortlist/:id" element={<Protected role="company"><Shortlist /></Protected>} />
      <Route path="/company/rate/:id" element={<Protected role="company"><Rate /></Protected>} />
      <Route path="/company/profile" element={<Protected role="company"><CompanyProfile /></Protected>} />
      <Route path="/company/notifications" element={<Protected role="company"><Notifications /></Protected>} />
      <Route path="/company/agreement/:id" element={<Protected role="company"><Agreement /></Protected>} />

      {/* Admin */}
      <Route path="/admin" element={<Protected role="admin"><AdminOverview /></Protected>} />
      <Route path="/admin/companies" element={<Protected role="admin"><AdminCompanies /></Protected>} />
      <Route path="/admin/tasks" element={<Protected role="admin"><AdminTasks /></Protected>} />
      <Route path="/admin/templates" element={<Protected role="admin"><AdminTemplates /></Protected>} />
      <Route path="/admin/shortlist" element={<Protected role="admin"><AdminShortlist /></Protected>} />
      <Route path="/admin/incidents" element={<Protected role="admin"><AdminIncidents /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleHome({ user }) {
  return <Navigate to={roleHome(user.role)} replace />;
}
