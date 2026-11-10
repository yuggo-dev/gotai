import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { RiArrowRightLine, RiPencilLine } from "react-icons/ri";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage, Field } from "../../components/ui";
import { SocialPostCard } from "../social/SocialPostCard";
import type { SocialPost } from "../social/types";
import { localDate, addDays, formatDay, resizeImage } from "../../lib/format";
import {
  practiceIcons,
  practiceNames,
  type PracticeLog,
} from "../../lib/practices";

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
  useEffect(() => {
    if (!editing) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !busy) closeEditor();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editing, busy]);
  if (!session?.membership) return <HomePage />;
  const days = Array.from({ length: 10 }, (_, index) =>
    addDays(localDate(), -index),
  );
  const roleLabel = session.membership.roles.join(", ") || "Integrante";
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
  function closeEditor() {
    if (busy) return;
    setEditing(false);
    setError("");
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
          <h1 className="profile-name-heading">{session.user.fullName}</h1>
          <p className="profile-username">
            <span>@{session.user.username}</span>
            <span className="profile-role-separator" aria-hidden="true">
              |
            </span>
            <span className="profile-role">{roleLabel}</span>
          </p>
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
          type="button"
          aria-label="Editar perfil"
          title="Editar perfil"
          onClick={() => {
            setEditing(true);
            setError("");
            setNotice("");
          }}
        >
          <RiPencilLine aria-hidden="true" focusable="false" />
        </button>
      </div>
      {notice && <p className="success-message">{notice}</p>}
      {editing && (
        <div
          className="creation-modal-backdrop"
          onClick={(clickEvent) => {
            if (clickEvent.target === clickEvent.currentTarget) closeEditor();
          }}
        >
          <form
            className="creation-card creation-modal profile-edit-form"
            onSubmit={(e) => void saveProfile(e)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
          >
            <header className="creation-modal-header">
              <div>
                <p className="eyebrow">Seu espaço</p>
                <h2 id="profile-edit-title">Editar perfil</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={closeEditor}
                aria-label="Fechar janela"
                disabled={busy}
              >
                ×
              </button>
            </header>
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
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
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
            <div className="creation-modal-actions">
              <button
                type="button"
                className="button button-quiet-light"
                onClick={closeEditor}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="button button-primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      )}
      {error && !editing && <ErrorMessage>{error}</ErrorMessage>}
      <section className="profile-section profile-practices-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Sua caminhada</p>
            <h2>Práticas recentes</h2>
          </div>
          <Link to="/perfil/desempenho" className="profile-details-link">
            Ver evolução <RiArrowRightLine aria-hidden="true" />
          </Link>
        </div>
        <div className="practice-recent-strip" aria-label="Práticas dos últimos dez dias">
          {days.map((date, index) => {
            const completed = Object.keys(practiceNames).filter((key) =>
              logs.some((log) => log.practiceKey === key && log.date === date),
            );

            return (
              <article className="practice-day-tile" key={date}>
                <div className="practice-day-date">
                  <strong>{index === 0 ? "Hoje" : formatDay(date)}</strong>
                  {index === 0 && <small>{formatDay(date)}</small>}
                </div>
                <div className="practice-day-icons">
                  {Object.entries(practiceNames).map(([key, label]) => {
                    const PracticeIcon = practiceIcons[key];
                    const done = completed.includes(key);

                    return (
                      <span
                        className={
                          done
                            ? "practice-day-indicator completed"
                            : "practice-day-indicator"
                        }
                        key={key}
                      role="img"
                        aria-label={`${label}: ${done ? "realizada" : "não realizada"}`}
                        title={`${label}: ${done ? "realizada" : "não realizada"}`}
                      >
                        <PracticeIcon aria-hidden="true" focusable="false" />
                      </span>
                    );
                  })}
                </div>
                <small className="practice-day-count">
                  {completed.length} de {Object.keys(practiceNames).length}
                </small>
              </article>
            );
          })}
        </div>
      </section>
      <section className="profile-section publications-section">
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
