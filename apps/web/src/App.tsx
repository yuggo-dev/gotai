import { Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./app/auth";
import { MemberNavigation } from "./layouts/MemberNavigation";
import { Header, HomePage } from "./pages/public/HomePage";
import { LoginPage, JoinPage } from "./pages/auth/AuthPages";
import { AdminPage } from "./pages/admin/AdminPage";
import { InformationalPage } from "./pages/informational/InformationalPage";
import { SocialPage } from "./pages/social/SocialPage";
import { PracticesPage } from "./pages/practices/PracticesPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { OrganogramPage } from "./pages/organogram/OrganogramPage";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { session } = useAuth();
  const isMember = Boolean(session?.membership);
  const isPublicHome = !isMember && location.pathname === "/";
  return (
    <div
      className={
        isMember
          ? "app-shell member-shell"
          : isPublicHome
            ? "app-shell public-home-shell"
            : "app-shell"
      }
    >
      {isMember ? <MemberNavigation /> : <Header isHome={isPublicHome} />}
      <main
        className={
          isMember
            ? "page-wrap member-page-wrap"
            : isPublicHome
              ? "page-wrap public-home-content"
              : "page-wrap"
        }
      >
        <Routes>
          <Route
            path="/"
            element={isMember ? <InformationalPage /> : <HomePage />}
          />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/praticas" element={<PracticesPage />} />
          <Route path="/organograma" element={<OrganogramPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/convite/:token" element={<JoinPage />} />
          <Route path="/administracao" element={<AdminPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      {!isMember && (
        <footer className="site-footer">
          goTAI <span>•</span> Dojotai de Campo Grande
        </footer>
      )}
    </div>
  );
}
