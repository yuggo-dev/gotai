import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { Loading } from "../../components/ui";

export function Header({ isHome }: { isHome: boolean }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className={isHome ? "topbar home-topbar" : "topbar"}>
      <Link to="/" className="brand" aria-label="goTAI — início">
        <img src="/gotai.png" alt="goTAI" />
      </Link>
      <nav className="topnav" aria-label="Navegação principal">
        {session?.membership && (
          <span className="dojo-label">{session.membership.dojotaiName}</span>
        )}
        {session?.membership?.roles.includes("Taityo") && (
          <Link to="/administracao" className="nav-link">
            Administração
          </Link>
        )}
        {session ? (
          <button
            className="text-button"
            onClick={() => void logout().then(() => navigate("/"))}
          >
            Sair
          </button>
        ) : (
          <Link to="/entrar" className="nav-link">
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
}

export function HomePage() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) {
    return (
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Sua comunidade, mais perto</p>
          <h1>Uma caminhada compartilhada começa por aqui.</h1>
          <p className="lead">
            Acompanhe práticas, participe das atividades e compartilhe
            experiências com sua comunidade do Dojotai.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/entrar">
              Entrar
            </Link>
            <span className="helper-text">
              O acesso começa por um convite do seu Dojotai.
            </span>
          </div>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <img className="home-logo" src="/gotai.png" alt="" />
          <div className="sun-ring">
            <span>光</span>
          </div>
          <p>comunidade · prática · presença</p>
        </div>
      </section>
    );
  }

  if (!session.membership) {
    const rejected = session.latestRequestStatus === "rejected";
    return (
      <section className="status-card">
        <span className="status-icon">{rejected ? "↺" : "◷"}</span>
        <p className="eyebrow">
          {rejected ? "Solicitação encerrada" : "Solicitação em análise"}
        </p>
        <h1>
          {rejected
            ? "Você precisará de um novo convite para tentar novamente."
            : "Seu pedido chegou ao Dojotai."}
        </h1>
        <p className="lead">
          {rejected
            ? "Peça um novo convite a alguém autorizado e envie outra solicitação."
            : "Uma pessoa autorizada vai revisar seus dados e definir sua categoria, cargo e Buntai."}
        </p>
      </section>
    );
  }

  return (
    <div className="dashboard">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">Bem-vinda(o) à comunidade</p>
          <h1>Olá, {session.user.fullName.split(" ")[0]}.</h1>
          <p className="lead">
            Seu espaço no {session.membership.dojotaiName} está pronto para
            começar.
          </p>
        </div>
        <div className="member-badge">
          <span>@{session.user.username}</span>
          <small>{session.membership.category}</small>
        </div>
      </section>
      <section className="feature-grid" aria-label="Áreas do goTAI">
        <article className="feature-card feature-card-strong">
          <span className="feature-icon">✦</span>
          <p className="eyebrow">Comunidade</p>
          <h2>Feed social</h2>
          <p>Compartilhe uma experiência com sua comunidade.</p>
          <span className="coming-label">Próxima etapa</span>
        </article>
        <article className="feature-card">
          <span className="feature-icon">◉</span>
          <p className="eyebrow">Sua caminhada</p>
          <h2>Práticas</h2>
          <p>Registre o dia de hoje e acompanhe sua sequência.</p>
          <span className="coming-label">Próxima etapa</span>
        </article>
        <article className="feature-card">
          <span className="feature-icon">⌖</span>
          <p className="eyebrow">No Dojotai</p>
          <h2>Atividades</h2>
          <p>Veja encontros e avisos da comunidade.</p>
          <span className="coming-label">Próxima etapa</span>
        </article>
      </section>
      <div className="profile-strip">
        <div>
          <strong>Seu vínculo</strong>
          <span>
            {session.membership.roles.join(" · ") || "Integrante"}
            {session.membership.buntaiName
              ? ` · ${session.membership.buntaiName}`
              : ""}
          </span>
        </div>
        <span className="profile-handle">@{session.user.username}</span>
      </div>
    </div>
  );
}
