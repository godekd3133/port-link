import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PostDetail from './pages/PostDetail';
import PostCreate from './pages/PostCreate';
import PostEdit from './pages/PostEdit';
import Profile from './pages/Profile';
import ProfileSettings from './pages/ProfileSettings';
import Collaborations from './pages/Collaborations';
import CareerInsights from './pages/CareerInsights';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './components/NotificationCenter';
import { LightboxProvider } from './components/Lightbox';
import { ConfettiProvider } from './components/MicroInteractions';
import CommandPalette from './components/CommandPalette';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>잠시만 기다려주세요...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AuthRedirectRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <LightboxProvider>
              <ConfettiProvider>
                <HashRouter>
                  <div className="app-shell">
                    <div className="bg-aurora" />
                    <div className="bg-grid" />
                    <CommandPalette />
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                          path="/login"
                          element={
                            <AuthRedirectRoute>
                              <Login />
                            </AuthRedirectRoute>
                          }
                        />
                        <Route
                          path="/register"
                          element={
                            <AuthRedirectRoute>
                              <Register />
                            </AuthRedirectRoute>
                          }
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/posts/:id" element={<PostDetail />} />
                        <Route
                          path="/posts/create"
                          element={
                            <ProtectedRoute>
                              <PostCreate />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/posts/:id/edit"
                          element={
                            <ProtectedRoute>
                              <PostEdit />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/profile/:userId" element={<Profile />} />
                        <Route
                          path="/settings/profile"
                          element={
                            <ProtectedRoute>
                              <ProfileSettings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/collaborations"
                          element={
                            <ProtectedRoute>
                              <Collaborations />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/insights"
                          element={
                            <ProtectedRoute>
                              <CareerInsights />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </div>
                </HashRouter>
              </ConfettiProvider>
            </LightboxProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
