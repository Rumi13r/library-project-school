import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import Login from "./components/LoginSystem/Login";
import Register from "./components/LoginSystem/Register";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import LibrarianDashboard from "./components/Dashboard/LibrarianDashboard";
import UserDashboard from "./components/Dashboard/UserDashboard";
import EventsPage from "./pages/EventsPage"; 
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AIResourcesPage from "./pages/AIResourcesPage"; 
import Bookcatalog from "./pages/BookLibraryPage"; 
import Archived from "./pages/ArchivedEventsPage"; 
import OnlineBook from "./pages/OnlineBooksPage"; 
import ReadersClubPage from "./pages/ReadersClubPage";

function App() {
  // Protected route за всички логнати потребители
  const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
    children,
    allowedRoles,
  }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) return <Navigate to="/login" />;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Ако ролята не е позволена, редирект към собствения dashboard
      return <Navigate to="/dashboard" />;
    }

    return <>{children}</>;
  };

  // Автоматично пренасочване според ролята
  const RoleBasedRedirect: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;

    switch (user.role) {
      case "admin":
        return <Navigate to="/admin" />;
      case "librarian":
        return <Navigate to="/librarian" />;
      case "reader":
      default:
        return <Navigate to="/dashboard" />;
    }
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          <Route
            path="/login"
            element={
              <Layout>
                <Login />
              </Layout>
            }
          />
          <Route
            path="/register"
            element={
              <Layout>
                <Register />
              </Layout>
            }
          />
          <Route
            path="/events"
            element={
              <Layout>
                <EventsPage />
              </Layout>
            }
          />
          <Route
            path="/ai-resources"
            element={
              <Layout>
                <AIResourcesPage />
              </Layout>
            }
          />
          <Route
            path="/catalog"
            element={
              <Layout>
                <Bookcatalog />
              </Layout>
            }
          />
          <Route
            path="/archivedEvents"
            element={
              <Layout>
                <Archived />
              </Layout>
            }
          />
          <Route
            path="/onlineBooks"
            element={
              <Layout>
                <OnlineBook />
              </Layout>
            }
          />
          <Route
            path="/readersClub"
            element={
              <Layout>
                <ReadersClubPage />
              </Layout>
            }
          />  
          {/* Auto-redirect route based on role */}
          <Route path="/redirect" element={<RoleBasedRedirect />} />

          {/* Protected routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/librarian"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <Layout>
                  <LibrarianDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;