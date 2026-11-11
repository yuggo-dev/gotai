import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  RiCalendar2Line,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiNodeTree,
  RiSettings3Line,
  RiUser3Line,
} from "react-icons/ri";
import { MdWavingHand } from "react-icons/md";
import { GiOrganigram } from "react-icons/gi";
import type { IconType } from "react-icons";
import { useAuth } from "../app/auth";

type AppTheme = "verde" | "azul" | "preto";

function getSavedTheme(): AppTheme {
  const saved = localStorage.getItem("gotai-theme");
  return saved === "azul" || saved === "preto" ? saved : "verde";
}

const feedLinks = [
  { to: "/", label: "Início", icon: RiHome5Line },
];
const sidebarLinks = [
  { to: "/atividades", label: "Atividades", icon: RiCalendar2Line },
  { to: "/organograma", label: "Organograma", icon: RiNodeTree },
];

function NavIcon({ icon: Icon }: { icon: IconType }) {
  return <Icon aria-hidden="true" focusable="false" />;
}

export function MemberNavigation() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topBarHidden, setTopBarHidden] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(getSavedTheme);
  const closeDrawer = () => setDrawerOpen(false);
  useEffect(() => {
    let previousScrollY = window.scrollY;
    const updateTopBarVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - previousScrollY;
      if (Math.abs(scrollDelta) < 5) return;

      if (currentScrollY < 48 || scrollDelta < 0) {
        setTopBarHidden(false);
      } else {
        setTopBarHidden(true);
      }
      previousScrollY = currentScrollY;
    };
    window.addEventListener("scroll", updateTopBarVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateTopBarVisibility);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("gotai-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (drawerOpen) setTopBarHidden(false);
  }, [drawerOpen]);
  return (
    <>
      <div className={topBarHidden ? "member-mobile-topbar is-hidden" : "member-mobile-topbar"}>
        <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
          <RiMenuLine aria-hidden="true" />
        </button>
        <Link to="/" aria-label="goTAI — Início">
          <img src="/gotai.png" alt="goTAI" />
        </Link>
      </div>
      {drawerOpen && (
        <button
          className="member-sidebar-backdrop"
          onClick={closeDrawer}
          aria-label="Fechar menu"
        />
      )}
      <aside
        className={drawerOpen ? "member-sidebar drawer-open" : "member-sidebar"}
      >
        <Link to="/" className="sidebar-brand">
          <img src="/gotai.png" alt="goTAI" />
        </Link>
        <Link to="/perfil" className="sidebar-profile" onClick={closeDrawer}>
          <div className="sidebar-avatar">
            {session?.user.avatarUrl ? (
              <img src={session.user.avatarUrl} alt="" />
            ) : (
              session?.user.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <span>
            <strong>{session?.user.fullName}</strong>
            <small>@{session?.user.username}</small>
            <em>
              <RiUser3Line aria-hidden="true" /> Meu Perfil
            </em>
          </span>
        </Link>
        <p className="sidebar-dojo">{session?.membership?.dojotaiName}</p>
        <nav aria-label="Navegação da sede" className="member-nav">
          {sidebarLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeDrawer}
              className={
                location.pathname === item.to
                  ? "member-nav-link active"
                  : "member-nav-link"
              }
            >
              <span>
                <NavIcon icon={item.icon} />
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-utilities">
          <label className="theme-picker" htmlFor="gotai-theme-select">
            <span>Tema de cores</span>
            <select
              id="gotai-theme-select"
              value={theme}
              onChange={(event) => setTheme(event.target.value as AppTheme)}
            >
              <option value="verde">Verde e dourado</option>
              <option value="azul">Preto e azulado</option>
              <option value="preto">Preto e dourado</option>
            </select>
          </label>
          {session?.membership?.roles.includes("Taityo") && (
            <Link
              to="/administracao"
              onClick={closeDrawer}
              className="member-nav-link"
            >
              <span>
                <RiSettings3Line aria-hidden="true" />
              </span>
              Administração
            </Link>
          )}
          <button
            className="member-nav-link logout-link"
            onClick={() => void logout().then(() => navigate("/"))}
          >
            <span>
              <RiLogoutBoxRLine aria-hidden="true" />
            </span>
            Sair
          </button>
        </div>
      </aside>
      <nav
        className={topBarHidden ? "desktop-feedbar is-hidden" : "desktop-feedbar"}
        aria-label="Navegação principal"
      >
        {feedLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={location.pathname === item.to ? "page" : undefined}
            className={
              location.pathname === item.to
                ? "desktop-feed-link active"
                : "desktop-feed-link"
            }
          >
            <span>
              <NavIcon icon={item.icon} />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="mobile-feedbar" aria-label="Navegação principal">
        <Link
          to="/"
          aria-current={location.pathname === "/" ? "page" : undefined}
          className={location.pathname === "/" ? "mobile-dock-link active" : "mobile-dock-link"}
          aria-label="Início"
          title="Início"
        >
          <RiHome5Line aria-hidden="true" />
        </Link>
        <Link
          to="/atividades"
          aria-current={location.pathname === "/atividades" ? "page" : undefined}
          className={location.pathname === "/atividades" ? "mobile-dock-link active" : "mobile-dock-link"}
          aria-label="Calendário de atividades"
          title="Atividades"
        >
          <RiCalendar2Line aria-hidden="true" />
        </Link>
        <Link
          to="/perfil/desempenho?registrar=1"
          className="mobile-practice-action"
          aria-label="Registrar práticas"
          title="Registrar práticas"
        >
          <MdWavingHand aria-hidden="true" />
        </Link>
        <Link
          to="/organograma"
          aria-current={location.pathname === "/organograma" ? "page" : undefined}
          className={location.pathname === "/organograma" ? "mobile-dock-link active" : "mobile-dock-link"}
          aria-label="Organograma"
          title="Organograma"
        >
          <GiOrganigram aria-hidden="true" />
        </Link>
        <Link
          to="/perfil"
          aria-current={location.pathname === "/perfil" ? "page" : undefined}
          className={location.pathname === "/perfil" ? "mobile-dock-link active" : "mobile-dock-link"}
          aria-label="Meu perfil"
          title="Meu perfil"
        >
          <span className="mobile-dock-avatar">
            {session?.user.avatarUrl ? (
              <img src={session.user.avatarUrl} alt="" />
            ) : (
              <RiUser3Line aria-hidden="true" />
            )}
          </span>
        </Link>
      </nav>
    </>
  );
}
