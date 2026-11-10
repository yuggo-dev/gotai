import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  RiChatSmile3Line,
  RiGridLine,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiNewspaperLine,
  RiNodeTree,
  RiSettings3Line,
  RiUser3Line,
} from "react-icons/ri";
import type { IconType } from "react-icons";
import { useAuth } from "../app/auth";

const feedLinks = [
  { to: "/", label: "Informativo", icon: RiNewspaperLine },
  { to: "/social", label: "Social", icon: RiChatSmile3Line },
];
const sidebarLinks = [
  { to: "/praticas", label: "Minhas Práticas", icon: RiGridLine },
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
  const closeDrawer = () => setDrawerOpen(false);
  return (
    <>
      <div className="member-mobile-topbar">
        <Link to="/" aria-label="goTAI — Informativo">
          <img src="/gotai.png" alt="goTAI" />
        </Link>
        <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menu">
          <RiMenuLine aria-hidden="true" />
        </button>
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
      <nav className="desktop-feedbar" aria-label="Feeds">
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
      <nav className="mobile-feedbar" aria-label="Feeds">
        {feedLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={location.pathname === item.to ? "page" : undefined}
            className={
              location.pathname === item.to
                ? "mobile-feed-link active"
                : "mobile-feed-link"
            }
          >
            <span>
              <NavIcon icon={item.icon} />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
