import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { LoginPage } from './pages/LoginPage.js';
import { BookingCounterPage } from './pages/BookingCounterPage.js';
import { BookedSevasPage } from './pages/BookedSevasPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { PoojariDashboardPage } from './pages/PoojariDashboardPage.js';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'booking_staff' | 'poojari')[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-[#7A1C23] font-semibold text-sm">
        🕉️ Loading Temple System...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to permitted default route
    if (user.role === 'poojari') return <Navigate to="/poojari" replace />;
    if (user.role === 'booking_staff') return <Navigate to="/counter" replace />;
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'poojari') return <Navigate to="/poojari" replace />;
  return <Navigate to="/counter" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/counter"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'booking_staff']}>
                    <BookingCounterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'booking_staff']}>
                    <BookedSevasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/poojari"
                element={
                  <ProtectedRoute allowedRoles={['poojari', 'admin']}>
                    <PoojariDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

