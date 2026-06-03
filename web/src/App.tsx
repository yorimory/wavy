import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShellLayout } from "@/components/layout/ShellLayout";
import { homePathForRole, isClient, isPrivatePerson, isModerator } from "@/utils/roles";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ClientDetailPage } from "@/pages/ClientDetailPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { ClientBookingsPage } from "@/pages/ClientBookingsPage";
import { ClientHomePage } from "@/pages/ClientHomePage";
import { ServiceSearchPage } from "@/pages/ServiceSearchPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { RetentionPage } from "@/pages/RetentionPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PricingPage } from "@/pages/PricingPage";
import { ChatPage } from "@/pages/ChatPage";
import { SupportPage } from "@/pages/SupportPage";
import { ModeratorPage } from "@/pages/ModeratorPage";

function FullscreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-primary font-medium">
      Загрузка…
    </div>
  );
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { token, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }: { children: ReactElement }) {
  const { token, user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (token && user) return <Navigate to={homePathForRole(user.role)} replace />;
  if (token) return <FullscreenSpinner />;
  return children;
}

function RequirePrivatePerson({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isPrivatePerson(user)) return <Navigate to={homePathForRole(user.role)} replace />;
  return children;
}

function RequireClient({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isClient(user)) return <Navigate to={homePathForRole(user.role)} replace />;
  return children;
}

function RequireModerator({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isModerator(user)) return <Navigate to={homePathForRole(user.role)} replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (isClient(user)) return <Navigate to="/home" replace />;
  if (isModerator(user)) return <Navigate to="/moderator" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <ShellLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route
          path="clients"
          element={
            <RequirePrivatePerson>
              <ClientsPage />
            </RequirePrivatePerson>
          }
        />
        <Route
          path="clients/:id"
          element={
            <RequirePrivatePerson>
              <ClientDetailPage />
            </RequirePrivatePerson>
          }
        />
        <Route
          path="home"
          element={
            <RequireClient>
              <ClientHomePage />
            </RequireClient>
          }
        />
        <Route
          path="search"
          element={
            <RequireClient>
              <ServiceSearchPage />
            </RequireClient>
          }
        />
        <Route
          path="services"
          element={
            <RequirePrivatePerson>
              <ServicesPage />
            </RequirePrivatePerson>
          }
        />
        <Route
          path="calendar"
          element={
            <RequirePrivatePerson>
              <CalendarPage />
            </RequirePrivatePerson>
          }
        />
        <Route
          path="my-bookings"
          element={
            <RequireClient>
              <ClientBookingsPage />
            </RequireClient>
          }
        />
        <Route
          path="retention"
          element={
            <RequirePrivatePerson>
              <RetentionPage />
            </RequirePrivatePerson>
          }
        />
        <Route
          path="pricing"
          element={
            <RequirePrivatePerson>
              <PricingPage />
            </RequirePrivatePerson>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="moderator"
          element={
            <RequireModerator>
              <ModeratorPage />
            </RequireModerator>
          }
        />
        <Route path="messages" element={<ChatPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
