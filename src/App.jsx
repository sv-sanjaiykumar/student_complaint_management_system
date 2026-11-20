import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import StudentRequests from "./pages/StudentRequests";
import NewRequest from "./pages/NewRequest";
import StudentRequestDetail from "./pages/StudentRequestDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRequests from "./pages/AdminRequests";
import AdminRequestDetail from "./pages/AdminRequestDetail";
import AdminStudents from "./pages/AdminStudents";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? (user.role === "admin" ? "/admin" : "/student") : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute role="student"><Layout role="student" /></ProtectedRoute>}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/requests" element={<StudentRequests />} />
        <Route path="/student/requests/new" element={<NewRequest />} />
        <Route path="/student/requests/:id" element={<StudentRequestDetail />} />
      </Route>

      <Route element={<ProtectedRoute role="admin"><Layout role="admin" /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/requests" element={<AdminRequests />} />
        <Route path="/admin/requests/:id" element={<AdminRequestDetail />} />
        <Route path="/admin/students" element={<AdminStudents />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
