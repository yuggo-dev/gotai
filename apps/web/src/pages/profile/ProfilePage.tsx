import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage, Field } from "../../components/ui";
import { SocialPostCard } from "../social/SocialPostCard";
import type { SocialPost } from "../social/types";
import { localDate, addDays, resizeImage } from "../../lib/format";
import { practiceNames, type PracticeLog } from "../../lib/practices";

export function ProfilePage() {
  const { session, refresh } = useAuth();
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    description: "",
  });
  useEffect(() => {
    if (!session) return;
    setForm({
      fullName: session.user.fullName,
      username: session.user.username,
      description: session.user.description ?? "",
    });
    setAvatarDataUrl(session.user.avatarUrl);
  }, [session]);
  useEffect(() => {
    if (session?.membership)
      void api<{ logs: PracticeLog[] }>("/api/me/practices")
        .then((result) => setLogs(result.logs))
        .catch(() => undefined);
  }, [session]);
  if (!session?.membership) return <HomePage />;
  const days = Array.from({ length: 10 }, (_, index) =>
    addDays(localDate(), index - 9),
  );
  async function chooseAvatar(file?: File) {
    if (!file) return;
    try {
      setAvatarDataUrl(await resizeImage(file));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/me/profile", {
        method: "PUT",
        body: JSON.stringify({ ...form, avatarDataUrl }),
      });
      await refresh();
      setEditing(false);
      setNotice("Perfil atualizado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="member-content profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">
          {session.user.avatarUrl ? (
            <img src={session.user.avatarUrl} alt="" />
          ) : (
            session.user.fullName.trim().charAt(0).toUpperCase()
          )}
        </div>
        <div className="profile-title">
          <p className="eyebrow">Seu espaço</p>
          <h1 className="profile-name-heading">{session.user.fullName}</h1>
          <p className="profile-username">@{session.user.username}</p>
          {session.user.description && (
            <p className="profile-description">{session.user.description}</p>
          )}
          <span className="profile-category">
            {session.membership.category}
            {session.membership.buntaiName
              ? ` · ${session.membership.buntaiName}`
              : ""}
          </span>
        </div>
        <button
          className="button button-quiet-light edit-profile-button"
          onClick={() => {
            setEditing((value) => !value);
            setNotice("");
          }}
        >
          Editar perfil
        </button>
      </div>
      {notice && <p className="success-message">{notice}</p>}
      {editing && (
        <form
          className="creation-card profile-edit-form"
          onSubmit={(e) => void saveProfile(e)}
        >
          <h2>Editar perfil</h2>
          <Field label="Nome">
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Username">
            <div className="username-input">
              <span>@</span>
              <input
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_.]+"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Descrição">
            <textarea
              rows={3}
              maxLength={280}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <Field label="Foto de perfil">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void chooseAvatar(e.target.files?.[0])}
            />
            <small>A imagem será redimensionada para o perfil.</small>
          </Field>
          {avatarDataUrl && (
            <button
              type="button"
              className="text-button"
              onClick={() => setAvatarDataUrl(null)}
            >
              Remover foto
            </button>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="composer-actions">
            <button
              type="button"
              className="button button-quiet-light"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button className="button button-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      )}
      {error && !editing && <ErrorMessage>{error}</ErrorMessage>}
      <section className="profile-section profile-practices-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Resumo visual</p>
            <h2>Práticas · últimos 10 dias</h2>
          </div>
          <Link to="/praticas" className="text-link">
            Ir para Minhas Práticas →
          </Link>
        </div>
        <div className="profile-practice-summary">
          {Object.entries(practiceNames).map(([key, label]) => (
            <div className="summary-row" key={key}>
              <span>{label}</span>
              <div
                className="practice-heatmap"
                aria-label={`${label}: últimos dez dias`}
              >
                {days.map((date) => (
                  <span
                    key={date}
                    className={
                      logs.some(
                        (log) => log.practiceKey === key && log.date === date,
                      )
                        ? "practice-cell filled"
                        : "practice-cell"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="heatmap-caption">
          Visualização informativa. Use Minhas Práticas para registrar.
        </p>
      </section>
      <section className="profile-section publications-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Comunidade</p>
            <h2>Histórico de publicações</h2>
          </div>
          <Link to="/social" className="text-link">
            Abrir Feed Social →
          </Link>
        </div>
        <ProfilePublications />
      </section>
    </section>
  );
}

function ProfilePublications() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  useEffect(() => {
    if (session?.membership)
      void api<{ posts: SocialPost[] }>("/api/social/posts")
        .then((result) =>
          setPosts(
            result.posts.filter(
              (post) => post.author.username === session.user.username,
            ),
          ),
        )
        .catch(() => undefined);
  }, [session]);
  return posts.length ? (
    <div className="social-post-list">
      {posts.map((post) => (
        <SocialPostCard key={post.id} post={post} />
      ))}
    </div>
  ) : (
    <div className="publications-empty">
      Suas publicações aparecerão aqui depois que forem compartilhadas no Feed
      Social.
    </div>
  );
}
