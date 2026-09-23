import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TeacherPublicProfile } from './components/Profile/TeacherPublicProfile';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Memuat...</p>
        </div>
      </div>
    );
  }

  // Simpan tujuan asli (mis. link notifikasi WA ?izin=...) supaya bisa kembali ke situ setelah login.
  return user ? <>{children}</> : <Navigate to="/login" state={{ from: location.pathname + location.search }} />;
}

function TeacherProfileWrapper() {
  const { teacherId } = useParams<{ teacherId: string }>();
  return <TeacherPublicProfile teacherId={teacherId || ''} />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/profile/:teacherId" element={<TeacherProfileWrapper />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
