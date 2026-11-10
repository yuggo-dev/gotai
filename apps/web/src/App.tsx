import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

type Session = {
  user: { id: string; fullName: string; username: string; email: string; description: string | null; avatarUrl: string | null };
  membership: { dojotaiId: string; dojotaiName: string; category: string; buntaiName: string | null; roles: string[] } | null;
  latestRequestStatus: string | null;
};

type AuthContextValue = { session: Session | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  return payload as T;
}

function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de AuthContext.");
  return value;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api<Session>("/api/auth/me");
      setSession(result);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setSession(null);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const isMember = Boolean(session?.membership);

  return (
    <AuthContext.Provider value={{ session, loading, refresh, logout }}>
      <div className={isMember ? "app-shell member-shell" : "app-shell"}>
        {isMember ? <MemberNavigation /> : <Header />}
        <main className={isMember ? "page-wrap member-page-wrap" : "page-wrap"}>
          <Routes>
            <Route path="/" element={isMember ? <InfoFeedPage /> : <HomePage />} />
            <Route path="/social" element={<SocialFeedPage />} />
            <Route path="/praticas" element={<PracticesPage />} />
            <Route path="/organograma" element={<OrganogramPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route path="/convite/:token" element={<JoinPage />} />
            <Route path="/administracao" element={<AdminPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        {!isMember && <footer className="site-footer">goTAI <span>•</span> Dojotai de Campo Grande</footer>}
      </div>
    </AuthContext.Provider>
  );
}

const memberLinks = [
  { to: "/", label: "Informativo", icon: "◉" },
  { to: "/social", label: "Social", icon: "◎" },
  { to: "/praticas", label: "Práticas", icon: "▦" },
  { to: "/organograma", label: "Organograma", icon: "⌘" },
  { to: "/perfil", label: "Perfil", icon: "◌" },
];

function MemberNavigation() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <aside className="member-sidebar">
      <Link to="/" className="sidebar-brand"><img src="/gotai.png" alt="goTAI" /></Link>
      <p className="sidebar-dojo">{session?.membership?.dojotaiName}</p>
      <nav aria-label="Navegação principal" className="member-nav">{memberLinks.map((item) => <Link key={item.to} to={item.to} className={location.pathname === item.to ? "member-nav-link active" : "member-nav-link"}><span>{item.icon}</span>{item.label}</Link>)}</nav>
      <div className="sidebar-bottom">{session?.membership?.roles.includes("Taityo") && <Link to="/administracao" className="member-nav-link"><span>⚙</span>Administração</Link>}<button className="member-nav-link logout-link" onClick={() => void logout().then(() => navigate("/"))}><span>↪</span>Sair</button></div>
    </aside>
    <nav className="mobile-nav" aria-label="Navegação principal">{memberLinks.map((item) => <Link key={item.to} to={item.to} aria-current={location.pathname === item.to ? "page" : undefined} className={location.pathname === item.to ? "mobile-nav-link active" : "mobile-nav-link"}><span>{item.icon}</span><small>{item.label}</small></Link>)}</nav>
  </>;
}

const practiceNames: Record<string, string> = { okiyome: "Okiyome", omairi: "Omairi", leitura: "Leitura", frequencia_sede: "Frequência na Sede" };
type PracticeLog = { practiceKey: string; date: string };

function InfoFeedPage() {
  const { session } = useAuth();
  const [data, setData] = useState<InfoFeedData>({ notices: [], events: [] });
  const [formType, setFormType] = useState<"notice" | "event" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ title: "", body: "" });
  const [event, setEvent] = useState({ title: "", description: "", startsAt: "", location: "" });
  const load = useCallback(async () => { try { setData(await api<InfoFeedData>("/api/informativo")); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { if (session?.membership) void load(); }, [session, load]);
  if (!session?.membership) return <HomePage />;
  async function submit(eventForm: FormEvent) {
    eventForm.preventDefault(); setBusy(true); setError("");
    try {
      if (formType === "notice") await api("/api/informativo/notices", { method: "POST", body: JSON.stringify(notice) });
      if (formType === "event") await api("/api/informativo/events", { method: "POST", body: JSON.stringify({ ...event, startsAt: new Date(event.startsAt).toISOString() }) });
      setFormType(null); setNotice({ title: "", body: "" }); setEvent({ title: "", description: "", startsAt: "", location: "" }); await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const hasItems = data.notices.length + data.events.length > 0;
  return <section className="member-content"><div className="content-heading heading-with-action"><div><p className="eyebrow">{session.membership.dojotaiName}</p><h1>Informativo</h1><p className="lead">Avisos e atividades importantes do seu Dojotai.</p></div><div className="creation-actions">{session.membership.roles.includes("Taityo") && <button className="button button-quiet-light" onClick={() => setFormType(formType === "notice" ? null : "notice")}>＋ Criar aviso</button>}<button className="button button-primary" onClick={() => setFormType(formType === "event" ? null : "event")}>＋ Criar evento</button></div></div>
    {formType && <form className="creation-card" onSubmit={(e) => void submit(e)}><div className="section-title-row"><h2>{formType === "notice" ? "Novo aviso" : "Novo evento"}<button type="button" className="close-button" onClick={() => setFormType(null)} aria-label="Fechar">×</button></h2></div>
      {formType === "notice" ? <><Field label="Título"><input required maxLength={120} value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} /></Field><Field label="Mensagem"><textarea required rows={4} maxLength={4000} value={notice.body} onChange={(e) => setNotice({ ...notice, body: e.target.value })} /></Field></> : <><Field label="Nome do evento"><input required maxLength={120} value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} /></Field><div className="form-row"><Field label="Data e horário"><input type="datetime-local" required value={event.startsAt} onChange={(e) => setEvent({ ...event, startsAt: e.target.value })} /></Field><Field label="Local"><input maxLength={200} value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} /></Field></div><Field label="Descrição"><textarea rows={3} maxLength={4000} value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} /></Field><p className="muted">Protótipo: evento visível para integrantes ativos do Dojotai.</p></>}
      {error && <ErrorMessage>{error}</ErrorMessage>}<button className="button button-primary" disabled={busy}>{busy ? "Publicando…" : formType === "notice" ? "Publicar aviso" : "Publicar evento"}</button>
    </form>}
    {error && !formType && <ErrorMessage>{error}</ErrorMessage>}
    {hasItems ? <div className="info-list">{data.notices.map((item) => <article className="content-card notice-card" key={item.id}><p className="eyebrow">Aviso · @{item.author.username}</p><h2>{item.title}</h2><p>{item.body}</p><small>{formatTimestamp(item.createdAt)}</small></article>)}{data.events.map((item) => <details className="content-card event-card" key={item.id}><summary><span className="event-date">{formatEventDate(item.startsAt)}</span><span><small>Evento · por @{item.author.username}</small><strong>{item.title}</strong><em>{item.location || "Local a definir"}</em></span><span className="event-chevron">⌄</span></summary><div className="event-detail"><p>{item.description || "Sem descrição adicional."}</p><p><strong>Quando:</strong> {formatTimestamp(item.startsAt)}{item.location ? ` · ${item.location}` : ""}</p></div></details>)}</div> : !formType && <article className="feed-empty"><span className="feed-empty-icon">◉</span><h2>O informativo começa aqui</h2><p>Quando houver avisos ou eventos para sua comunidade, eles aparecerão nesta área.</p></article>}
  </section>;
}

type InfoFeedData = { notices: { id: string; title: string; body: string; createdAt: string; author: { fullName: string; username: string } }[]; events: { id: string; title: string; description: string; startsAt: string; location: string; createdAt: string; author: { fullName: string; username: string } }[] };

function SocialFeedPage() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<{ kind: "image" | "audio" | "video"; dataUrl: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const result = await api<{ posts: SocialPost[] }>("/api/social/posts"); setPosts(result.posts); } catch (e) { setError((e as Error).message); } }, []);
  useEffect(() => { if (session?.membership) void load(); }, [session, load]);
  if (!session?.membership) return <HomePage />;
  async function addFiles(files: FileList | null) {
    if (!files) return; setError("");
    const selected = Array.from(files).slice(0, Math.max(0, 4 - media.length));
    try {
      const additions = await Promise.all(selected.map(async (file) => {
        if (file.size > 5 * 1024 * 1024) throw new Error("Cada arquivo pode ter no máximo 5 MB.");
        const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : null;
        if (!kind) throw new Error("Escolha fotos, áudios ou vídeos compatíveis.");
        return { kind, dataUrl: await fileToDataUrl(file), name: file.name } as const;
      }));
      setMedia((current) => [...current, ...additions].slice(0, 4));
    } catch (e) { setError((e as Error).message); }
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/social/posts", { method: "POST", body: JSON.stringify({ body, media: media.map(({ kind, dataUrl }) => ({ kind, dataUrl })) }) }); setBody(""); setMedia([]); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="member-content"><div className="content-heading"><div><p className="eyebrow">Comunidade</p><h1>Social</h1><p className="lead">Publicações das pessoas do seu Dojotai.</p></div></div>
    <form className="post-composer" onSubmit={(e) => void publish(e)}><div className="composer-top"><div className="profile-avatar small-avatar">{session.user.avatarUrl ? <img src={session.user.avatarUrl} alt="" /> : session.user.fullName.charAt(0).toUpperCase()}</div><textarea aria-label="Texto da publicação" rows={3} maxLength={2000} placeholder={`O que você gostaria de compartilhar, @${session.user.username}?`} value={body} onChange={(e) => setBody(e.target.value)} /></div>
      {!!media.length && <div className="attachment-list">{media.map((item, index) => <span key={`${item.name}-${index}`}>{item.kind === "image" ? "▧" : item.kind === "audio" ? "♫" : "▶"} {item.name}<button type="button" aria-label={`Remover ${item.name}`} onClick={() => setMedia((current) => current.filter((_, i) => i !== index))}>×</button></span>)}</div>}
      {error && <ErrorMessage>{error}</ErrorMessage>}<div className="composer-actions"><label className="attach-button">＋ Mídia<input type="file" accept="image/*,audio/*,video/*" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.currentTarget.value = ""; }} /></label><button className="button button-primary" disabled={busy || (!body.trim() && !media.length)}>{busy ? "Publicando…" : "Publicar"}</button></div>
    </form>
    {posts.length ? <div className="social-post-list">{posts.map((post) => <SocialPostCard key={post.id} post={post} />)}</div> : <article className="feed-empty"><span className="feed-empty-icon">◎</span><h2>Seu feed social está pronto</h2><p>As publicações da comunidade aparecerão aqui.</p></article>}
  </section>;
}

type SocialPost = { id: string; body: string; media: { kind: "image" | "audio" | "video"; dataUrl: string }[]; createdAt: string; author: { fullName: string; username: string; avatarUrl: string | null } };

function SocialPostCard({ post }: { post: SocialPost }) {
  return <article className="social-post"><div className="post-author"><div className="profile-avatar small-avatar">{post.author.avatarUrl ? <img src={post.author.avatarUrl} alt="" /> : post.author.fullName.charAt(0).toUpperCase()}</div><div><strong>{post.author.fullName}</strong><span>@{post.author.username} · {formatTimestamp(post.createdAt)}</span></div></div>{post.body && <p className="post-body">{post.body}</p>}<div className="post-media">{post.media.map((item, index) => item.kind === "image" ? <img key={index} src={item.dataUrl} alt="Mídia da publicação" /> : item.kind === "audio" ? <audio key={index} controls src={item.dataUrl} /> : <video key={index} controls src={item.dataUrl} />)}</div></article>;
}

function OrganogramPage() {
  const { session } = useAuth();
  if (!session?.membership) return <HomePage />;
  return <section className="member-content"><div className="content-heading"><div><p className="eyebrow">{session.membership.dojotaiName}</p><h1>Organograma</h1><p className="lead">Uma visão de como as pessoas e os grupos se organizam na sede.</p></div></div><article className="feed-empty"><span className="feed-empty-icon">⌘</span><h2>Organograma ainda não configurado</h2><p>Quando os vínculos e grupos estiverem organizados no goTAI, a estrutura da sede será exibida aqui.</p></article></section>;
}

function PracticesPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [today, setToday] = useState("");
  const [month, setMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loadingPractices, setLoadingPractices] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const result = await api<{ today: string; logs: PracticeLog[] }>("/api/me/practices"); setToday(result.today); setMonth((current) => current || result.today.slice(0, 7)); setSelectedDate((current) => current || result.today); setLogs(result.logs); setError(""); }
    catch (e) { setError((e as Error).message); }
    finally { setLoadingPractices(false); }
  }, []);
  useEffect(() => { if (session?.membership) void load(); }, [session, load]);
  if (!session?.membership) return <HomePage />;
  const first = month ? new Date(`${month}-01T12:00:00Z`) : new Date();
  const offset = first.getUTCDay();
  const calendarDays = month ? Array.from({ length: 42 }, (_, index) => { const date = new Date(first); date.setUTCDate(index - offset + 1); return date.toISOString().slice(0, 10); }) : [];
  const editable = (date: string) => Boolean(today && date <= today && date >= addDays(today, -2));
  async function togglePractice(practiceKey: string) {
    if (!selectedDate || !editable(selectedDate)) return;
    const performed = !logs.some((log) => log.practiceKey === practiceKey && log.date === selectedDate);
    setError("");
    try { await api("/api/me/practices", { method: "POST", body: JSON.stringify({ practiceKey, date: selectedDate, performed }) }); await load(); }
    catch (e) { setError((e as Error).message); }
  }
  function shiftMonth(amount: number) { const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); setMonth(date.toISOString().slice(0, 7)); }
  return <section className="member-content"><div className="content-heading"><div><p className="eyebrow">Sua caminhada</p><h1>Práticas</h1><p className="lead">Registre e consulte suas práticas no calendário.</p></div></div>
    <section className="practice-calendar-card"><div className="calendar-heading"><button className="calendar-arrow" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">‹</button><h2>{month && new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first)}</h2><button className="calendar-arrow" onClick={() => shiftMonth(1)} aria-label="Próximo mês" disabled={month >= today.slice(0, 7)}>›</button></div>
      <div className="calendar-grid calendar-weekdays">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid">{calendarDays.map((date) => { const currentMonth = date.slice(0, 7) === month; const hasPractice = logs.some((log) => log.date === date); return <button key={date} disabled={!currentMonth || date > today} className={`calendar-day${currentMonth ? "" : " outside"}${date === selectedDate ? " selected" : ""}${hasPractice ? " has-practice" : ""}${!editable(date) ? " locked" : ""}`} onClick={() => setSelectedDate(date)} aria-label={`${formatDay(date)}${hasPractice ? ", prática registrada" : ""}`}><span>{Number(date.slice(8, 10))}</span>{hasPractice && <i />}</button>; })}</div>
      <p className="calendar-legend"><span className="legend-dot" /> Dia com prática registrada <span>·</span> Só hoje e os dois dias anteriores podem ser editados</p>
    </section>
    <section className="practice-day-card"><div className="section-title-row"><div><p className="eyebrow">Registro do dia</p><h2>{selectedDate === today ? "Hoje" : formatLongDate(selectedDate)}</h2></div><span className={editable(selectedDate) ? "editable-tag" : "readonly-tag"}>{editable(selectedDate) ? "Editável" : "Somente consulta"}</span></div>
      {loadingPractices ? <p className="muted">Carregando práticas…</p> : <div className="practice-checklist">{Object.entries(practiceNames).map(([key, label]) => { const done = logs.some((log) => log.practiceKey === key && log.date === selectedDate); return <div className="practice-check-row" key={key}><span><i className={done ? "practice-check checked" : "practice-check"}>{done ? "✓" : ""}</i>{label}</span><button disabled={!editable(selectedDate)} className={done ? "practice-toggle done" : "practice-toggle"} onClick={() => void togglePractice(key)}>{done ? "Feita · desfazer" : "Marcar como feita"}</button></div>; })}</div>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </section>
  </section>;
}

function ProfilePage() {
  const { session, refresh } = useAuth();
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", username: "", description: "" });
  useEffect(() => {
    if (!session) return;
    setForm({ fullName: session.user.fullName, username: session.user.username, description: session.user.description ?? "" });
    setAvatarDataUrl(session.user.avatarUrl);
  }, [session]);
  useEffect(() => { if (session?.membership) void api<{ logs: PracticeLog[] }>("/api/me/practices").then((result) => setLogs(result.logs)).catch(() => undefined); }, [session]);
  if (!session?.membership) return <HomePage />;
  const days = Array.from({ length: 10 }, (_, index) => addDays(localDate(), index - 9));
  async function chooseAvatar(file?: File) { if (!file) return; try { setAvatarDataUrl(await resizeImage(file)); setError(""); } catch (e) { setError((e as Error).message); } }
  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await api("/api/me/profile", { method: "PUT", body: JSON.stringify({ ...form, avatarDataUrl }) }); await refresh(); setEditing(false); setNotice("Perfil atualizado."); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="member-content profile-page">
    <div className="profile-hero"><div className="profile-avatar">{session.user.avatarUrl ? <img src={session.user.avatarUrl} alt="" /> : session.user.fullName.trim().charAt(0).toUpperCase()}</div><div className="profile-title"><p className="eyebrow">Perfil</p><h1>{session.user.fullName}</h1><p className="profile-username">@{session.user.username}</p>{session.user.description && <p className="profile-description">{session.user.description}</p>}<span className="profile-category">{session.membership.category}{session.membership.buntaiName ? ` · ${session.membership.buntaiName}` : ""}</span></div><button className="button button-quiet-light edit-profile-button" onClick={() => { setEditing((value) => !value); setNotice(""); }}>Editar perfil</button></div>
    {notice && <p className="success-message">{notice}</p>}
    {editing && <form className="creation-card profile-edit-form" onSubmit={(e) => void saveProfile(e)}><h2>Editar perfil</h2><Field label="Nome"><input required minLength={2} maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field><Field label="Username"><div className="username-input"><span>@</span><input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]+" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div></Field><Field label="Descrição"><textarea rows={3} maxLength={280} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><Field label="Foto de perfil"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void chooseAvatar(e.target.files?.[0])} /><small>A imagem será redimensionada para o perfil.</small></Field>{avatarDataUrl && <button type="button" className="text-button" onClick={() => setAvatarDataUrl(null)}>Remover foto</button>}{error && <ErrorMessage>{error}</ErrorMessage>}<div className="composer-actions"><button type="button" className="button button-quiet-light" onClick={() => setEditing(false)}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</button></div></form>}
    {error && !editing && <ErrorMessage>{error}</ErrorMessage>}
    <section className="profile-section"><div className="section-title-row"><div><p className="eyebrow">Resumo visual</p><h2>Práticas · últimos 10 dias</h2></div><Link to="/praticas" className="text-link">Ir para Práticas →</Link></div><div className="profile-practice-summary">{Object.entries(practiceNames).map(([key, label]) => <div className="summary-row" key={key}><span>{label}</span><div className="practice-heatmap" aria-label={`${label}: últimos dez dias`}>{days.map((date) => <span key={date} className={logs.some((log) => log.practiceKey === key && log.date === date) ? "practice-cell filled" : "practice-cell"} aria-hidden="true" />)}</div></div>)}</div><p className="heatmap-caption">Visualização informativa. Use a aba Práticas para registrar.</p></section>
    <section className="profile-section publications-section"><div className="section-title-row"><div><p className="eyebrow">Comunidade</p><h2>Publicações</h2></div><Link to="/social" className="text-link">Abrir Feed Social →</Link></div><ProfilePublications /></section>
  </section>;
}

function ProfilePublications() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  useEffect(() => { if (session?.membership) void api<{ posts: SocialPost[] }>("/api/social/posts").then((result) => setPosts(result.posts.filter((post) => post.author.username === session.user.username))).catch(() => undefined); }, [session]);
  return posts.length ? <div className="social-post-list">{posts.map((post) => <SocialPostCard key={post.id} post={post} />)}</div> : <div className="publications-empty">Suas publicações aparecerão aqui depois que forem compartilhadas no Feed Social.</div>;
}

function addDays(date: string, amount: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); }
function formatDay(date: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00Z`)); }
function formatLongDate(date: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }
function localDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function formatTimestamp(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function formatEventDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Campo_Grande" }).format(new Date(value)); }
function fileToDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Não foi possível ler o arquivo.")); reader.onerror = () => reject(new Error("Não foi possível ler o arquivo.")); reader.readAsDataURL(file); }); }
async function resizeImage(file: File): Promise<string> { if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem PNG, JPEG ou WebP."); const src = await fileToDataUrl(file); const image = new Image(); image.src = src; await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Não foi possível abrir essa imagem.")); }); const scale = Math.min(1, 512 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/jpeg", .82); }

function Header() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="goTAI — início">
        <img src="/icon.svg" alt="" />
        <span>go<span className="brand-accent">TAI</span></span>
      </Link>
      <nav className="topnav" aria-label="Navegação principal">
        {session?.membership && <span className="dojo-label">{session.membership.dojotaiName}</span>}
        {session?.membership?.roles.includes("Taityo") && <Link to="/administracao" className="nav-link">Administração</Link>}
        {session ? <button className="text-button" onClick={() => void logout().then(() => navigate("/"))}>Sair</button> : <Link to="/entrar" className="nav-link">Entrar</Link>}
      </nav>
    </header>
  );
}

function HomePage() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) {
    return (
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Sua comunidade, mais perto</p>
          <h1>Uma caminhada compartilhada começa por aqui.</h1>
          <p className="lead">Acompanhe práticas, participe das atividades e compartilhe experiências com sua comunidade do Dojotai.</p>
          <div className="hero-actions"><Link className="button button-primary" to="/entrar">Entrar</Link><span className="helper-text">O acesso começa por um convite do seu Dojotai.</span></div>
        </div>
        <div className="hero-mark" aria-hidden="true"><div className="sun-ring"><span>光</span></div><p>comunidade · prática · presença</p></div>
      </section>
    );
  }

  if (!session.membership) {
    const rejected = session.latestRequestStatus === "rejected";
    return (
      <section className="status-card">
        <span className="status-icon">{rejected ? "↺" : "◷"}</span>
        <p className="eyebrow">{rejected ? "Solicitação encerrada" : "Solicitação em análise"}</p>
        <h1>{rejected ? "Você precisará de um novo convite para tentar novamente." : "Seu pedido chegou ao Dojotai."}</h1>
        <p className="lead">{rejected ? "Peça um novo convite a alguém autorizado e envie outra solicitação." : "Uma pessoa autorizada vai revisar seus dados e definir sua categoria, cargo e Buntai."}</p>
      </section>
    );
  }

  return (
    <div className="dashboard">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">Bem-vinda(o) à comunidade</p>
          <h1>Olá, {session.user.fullName.split(" ")[0]}.</h1>
          <p className="lead">Seu espaço no {session.membership.dojotaiName} está pronto para começar.</p>
        </div>
        <div className="member-badge"><span>@{session.user.username}</span><small>{session.membership.category}</small></div>
      </section>
      <section className="feature-grid" aria-label="Áreas do goTAI">
        <article className="feature-card feature-card-strong"><span className="feature-icon">✦</span><p className="eyebrow">Comunidade</p><h2>Feed social</h2><p>Compartilhe uma experiência com sua comunidade.</p><span className="coming-label">Próxima etapa</span></article>
        <article className="feature-card"><span className="feature-icon">◉</span><p className="eyebrow">Sua caminhada</p><h2>Práticas</h2><p>Registre o dia de hoje e acompanhe sua sequência.</p><span className="coming-label">Próxima etapa</span></article>
        <article className="feature-card"><span className="feature-icon">⌖</span><p className="eyebrow">No Dojotai</p><h2>Atividades</h2><p>Veja encontros e avisos da comunidade.</p><span className="coming-label">Próxima etapa</span></article>
      </section>
      <div className="profile-strip"><div><strong>Seu vínculo</strong><span>{session.membership.roles.join(" · ") || "Integrante"}{session.membership.buntaiName ? ` · ${session.membership.buntaiName}` : ""}</span></div><span className="profile-handle">@{session.user.username}</span></div>
    </div>
  );
}

function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); await refresh(); navigate("/"); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <AuthCard title="Que bom ter você por aqui." intro="Entre com o e-mail e a senha cadastrados no goTAI.">
    <form onSubmit={submit} className="form-stack">
      <Field label="E-mail"><input autoComplete="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Senha"><input autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
    </form>
  </AuthCard>;
}

function JoinPage() {
  const { token = "" } = useParams();
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [dojoName, setDojoName] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", username: "", birthDate: "", email: "", phone: "", password: "", description: "" });

  useEffect(() => {
    let active = true;
    api<{ valid: boolean; dojotaiName: string }>(`/api/invitations/${encodeURIComponent(token)}`)
      .then((info) => { if (active) { setValid(info.valid); setDojoName(info.dojotaiName); } })
      .catch(() => { if (active) setValid(false); });
    return () => { active = false; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await api("/api/join-requests", { method: "POST", body: JSON.stringify({ ...form, token }) });
      await refresh(); navigate("/");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (session?.membership) return <AuthCard title="Você já entrou em um Dojotai." intro="Para mudar de sede, é necessário seguir o fluxo de transferência."><Link className="button button-primary button-wide" to="/">Voltar ao início</Link></AuthCard>;
  if (session?.latestRequestStatus === "pending") return <AuthCard title="Seu pedido já está em análise." intro={`A solicitação para entrar no ${dojoName || "Dojotai"} continua pendente.`}><Link className="button button-primary button-wide" to="/">Ver status</Link></AuthCard>;
  if (session?.latestRequestStatus === "rejected") return <RetryJoinCard token={token} />;
  if (session) return <AuthCard title="Convite para uma nova solicitação" intro="Sua conta já existe. Use o novo convite para solicitar entrada neste Dojotai."><RetryJoinCard token={token} /></AuthCard>;
  if (valid === null) return <Loading />;
  if (!valid) return <AuthCard title="Convite indisponível" intro="Este link expirou, já foi usado ou não existe. Peça um novo convite a alguém autorizado." />;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }
  return <AuthCard title="Vamos conhecer você." intro={`Preencha seus dados para solicitar entrada no ${dojoName}. A solicitação será revisada por uma pessoa autorizada.`}>
    <form onSubmit={submit} className="form-stack">
      <Field label="Nome completo"><input autoComplete="name" required minLength={2} maxLength={120} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} /></Field>
      <Field label="Username"><div className="username-input"><span>@</span><input autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]+" value={form.username} onChange={(e) => update("username", e.target.value)} /></div></Field>
      <div className="form-row"><Field label="Data de nascimento"><input autoComplete="bday" type="date" required value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} /></Field><Field label="Telefone"><input autoComplete="tel" type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field></div>
      <Field label="E-mail"><input autoComplete="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
      <Field label="Senha"><input autoComplete="new-password" type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} /><small>Use pelo menos 8 caracteres.</small></Field>
      <Field label="Descrição (opcional)"><textarea rows={3} maxLength={280} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field>
      <p className="privacy-note">Seu pedido e seus dados cadastrais serão vistos apenas por pessoas autorizadas a aprovar a entrada.</p>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Enviando…" : "Solicitar entrada"}</button>
    </form>
  </AuthCard>;
}

function RetryJoinCard({ token }: { token: string }) {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true); setError("");
    try { await api("/api/join-requests/retry", { method: "POST", body: JSON.stringify({ token }) }); await refresh(); navigate("/"); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="form-stack">{error && <ErrorMessage>{error}</ErrorMessage>}<button className="button button-primary button-wide" disabled={busy} onClick={() => void retry()}>{busy ? "Enviando…" : "Solicitar entrada novamente"}</button><Link className="helper-text" to="/">Voltar ao início</Link></div>;
}

type JoinRequest = { id: string; requested_at: string; full_name: string; username: string; birth_date: string; email: string; phone: string; description: string | null };
type Buntai = { id: string; name: string };
type AdminData = { requests: JoinRequest[]; buntais: Buntai[]; categories: string[]; roles: string[] };

function AdminPage() {
  const { session, loading } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [buntaiName, setBuntaiName] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try { setData(await api<AdminData>("/api/admin/join-requests")); setError(""); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (session?.membership?.roles.includes("Taityo")) void load(); }, [session, load]);

  async function makeInvite() {
    setNotice("");
    try {
      const result = await api<{ token: string; expiresAt: string }>("/api/admin/invitations", { method: "POST", body: "{}" });
      setInviteUrl(`${window.location.origin}/convite/${result.token}`);
      setNotice(`Convite criado; expira em ${new Date(result.expiresAt).toLocaleDateString("pt-BR")}.`);
    } catch (e) { setError((e as Error).message); }
  }

  async function addBuntai(event: FormEvent) {
    event.preventDefault(); setNotice("");
    try { await api("/api/admin/buntais", { method: "POST", body: JSON.stringify({ name: buntaiName }) }); setBuntaiName(""); setNotice("Buntai cadastrado."); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  if (loading) return <Loading />;
  if (!session) return <AuthCard title="Entre para continuar" intro="A administração é restrita a pessoas com permissão de Taityo."><Link className="button button-primary button-wide" to="/entrar">Entrar</Link></AuthCard>;
  if (!session.membership?.roles.includes("Taityo")) return <AuthCard title="Acesso restrito" intro="Sua conta não tem permissão de Taityo nesta sede." />;

  return <section className="admin-page">
    <div className="section-heading"><div><p className="eyebrow">{session.membership.dojotaiName}</p><h1>Administração</h1><p className="lead">Convites e solicitações de entrada.</p></div><button onClick={() => void makeInvite()} className="button button-primary">＋ Criar convite</button></div>
    {inviteUrl && <div className="invite-result"><strong>Link de uso único</strong><code>{inviteUrl}</code><button className="button button-small" onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => setNotice("Link copiado."))}>Copiar link</button></div>}
    {notice && <p className="success-message">{notice}</p>}
    {error && <ErrorMessage>{error}</ErrorMessage>}
    <div className="admin-layout">
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Aguardando análise</p><h2>Solicitações</h2></div><button className="text-button" onClick={() => void load()}>Atualizar</button></div>
        {data?.requests.length ? <div className="request-list">{data.requests.map((request) => <ReviewRequest key={request.id} request={request} data={data} onDone={load} />)}</div> : <div className="empty-state"><span>✓</span><p>Nenhuma solicitação pendente.</p></div>}
      </section>
      <section className="panel buntais-panel"><p className="eyebrow">Organização</p><h2>Buntai</h2><p className="muted">Cadastre os grupos disponíveis para atribuição na aprovação.</p>
        <form onSubmit={addBuntai} className="inline-form"><input aria-label="Nome do Buntai" required minLength={2} maxLength={80} placeholder="Nome do Buntai" value={buntaiName} onChange={(e) => setBuntaiName(e.target.value)} /><button className="button button-small">Adicionar</button></form>
        <ul className="buntai-list">{data?.buntais.map((buntai) => <li key={buntai.id}>{buntai.name}</li>)}</ul>
      </section>
    </div>
  </section>;
}

function ReviewRequest({ request, data, onDone }: { request: JoinRequest; data: AdminData; onDone: () => Promise<void> }) {
  const [category, setCategory] = useState(data.categories[0] ?? "");
  const [roles, setRoles] = useState<string[]>([]);
  const [buntaiId, setBuntaiId] = useState(data.buntais[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(action: "approve" | "reject") {
    setBusy(true); setError("");
    try {
      await api(`/api/admin/join-requests/${request.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "approve" ? { category, roles, buntaiId } : {}),
      });
      await onDone();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <article className="request-card">
    <div className="request-person"><div className="avatar-placeholder">{request.full_name.trim().charAt(0).toUpperCase()}</div><div><h3>{request.full_name}</h3><span>@{request.username} · {request.birth_date}</span></div></div>
    <div className="request-private"><span>{request.email}</span><span>{request.phone}</span>{request.description && <p>{request.description}</p>}</div>
    <div className="approval-fields"><Field label="Categoria"><select value={category} onChange={(e) => setCategory(e.target.value)}>{data.categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Buntai"><select required value={buntaiId} onChange={(e) => setBuntaiId(e.target.value)}><option value="" disabled>Selecione</option>{data.buntais.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    </div>
    <fieldset className="roles-field"><legend>Cargos</legend><div className="role-options">{data.roles.map((role) => <label key={role}><input type="checkbox" checked={roles.includes(role)} onChange={(e) => setRoles((current) => e.target.checked ? [...current, role] : current.filter((item) => item !== role))} />{role}</label>)}</div></fieldset>
    {error && <ErrorMessage>{error}</ErrorMessage>}
    <div className="request-actions"><button className="button button-quiet" disabled={busy} onClick={() => void decide("reject")}>Recusar</button><button className="button button-primary" disabled={busy || !buntaiId || roles.length === 0} onClick={() => void decide("approve")}>{busy ? "Salvando…" : "Aprovar e atribuir"}</button></div>
  </article>;
}

function AuthCard({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return <section className="auth-card"><p className="eyebrow">goTAI · Dojotai</p><h1>{title}</h1><p className="lead">{intro}</p>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function ErrorMessage({ children }: { children: ReactNode }) { return <p className="error-message" role="alert">{children}</p>; }

function Loading() { return <div className="loading-state"><span className="loader" /> Carregando o goTAI…</div>; }
