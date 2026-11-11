import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage, Field } from "../../components/ui";
import {
  MediaAttachmentControls,
  MediaViewer,
  readMediaFiles,
  type MediaAsset,
  type MediaDraft,
} from "../../components/media";
import { formatEventDate, formatTimestamp, formatTime } from "../../lib/format";

export function InformationalPage() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<InfoFeedData>({ notices: [], events: [] });
  const [formType, setFormType] = useState<"notice" | "event" | null>(() => {
    const requestedForm = searchParams.get("criar");
    return requestedForm === "aviso"
      ? "notice"
      : requestedForm === "evento"
        ? "event"
        : null;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ title: "", body: "" });
  const [event, setEvent] = useState({
    title: "",
    description: "",
    startsAt: "",
    location: "",
  });
  const [media, setMedia] = useState<MediaDraft[]>([]);
  useEffect(() => {
    if (!formType) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !busy) {
        setFormType(null);
        setMedia([]);
        setError("");
        setSearchParams({}, { replace: true });
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [formType, busy, setSearchParams]);
  const load = useCallback(async () => {
    try {
      setData(await api<InfoFeedData>("/api/informativo"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (session?.membership) void load();
  }, [session, load]);
  if (!session?.membership) return <HomePage />;
  async function addMedia(files: FileList | null) {
    try {
      setMedia(await readMediaFiles(files, media));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function closeComposer() {
    if (busy) return;
    setFormType(null);
    setMedia([]);
    setError("");
    setSearchParams({}, { replace: true });
  }
  async function submit(eventForm: FormEvent) {
    eventForm.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (formType === "notice")
        await api("/api/informativo/notices", {
          method: "POST",
          body: JSON.stringify({
            ...notice,
            media: media.map(({ kind, dataUrl }) => ({ kind, dataUrl })),
          }),
        });
      if (formType === "event")
        await api("/api/informativo/events", {
          method: "POST",
          body: JSON.stringify({
            ...event,
            startsAt: new Date(event.startsAt).toISOString(),
            media: media.map(({ kind, dataUrl }) => ({ kind, dataUrl })),
          }),
        });
      setFormType(null);
      setNotice({ title: "", body: "" });
      setEvent({ title: "", description: "", startsAt: "", location: "" });
      setMedia([]);
      setSearchParams({}, { replace: true });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const hasItems = data.notices.length + data.events.length > 0;
  return (
    <section className="member-content">
      <div className="content-heading heading-with-action">
        <div>
          <p className="eyebrow">{session.membership.dojotaiName}</p>
          <h1>Avisos</h1>
          <p className="lead">
            Avisos e atividades importantes do seu Dojotai.
          </p>
        </div>
        <div className="creation-actions">
          {session.membership.roles.includes("Taityo") && (
            <button
              className="button button-quiet-light"
              onClick={() => {
                setMedia([]);
                setError("");
                setFormType(formType === "notice" ? null : "notice");
              }}
            >
              ＋ Criar aviso
            </button>
          )}
          <button
            className="button button-primary"
            onClick={() => {
              setMedia([]);
              setError("");
              setFormType(formType === "event" ? null : "event");
            }}
          >
            ＋ Criar evento
          </button>
        </div>
      </div>
      {formType && (
        <div
          className="creation-modal-backdrop"
          onClick={(clickEvent) => {
            if (clickEvent.target === clickEvent.currentTarget) closeComposer();
          }}
        >
          <form
            className="creation-card creation-modal"
            onSubmit={(e) => void submit(e)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="creation-modal-title"
          >
            <header className="creation-modal-header">
              <div>
                <p className="eyebrow">Publicação no Informativo</p>
                <h2 id="creation-modal-title">
                  {formType === "notice" ? "Novo aviso" : "Novo evento"}
                </h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={closeComposer}
                aria-label="Fechar janela"
                disabled={busy}
              >
                ×
              </button>
            </header>
            {formType === "notice" ? (
              <>
                <Field label="Título">
                  <input
                    required
                    maxLength={120}
                    value={notice.title}
                    onChange={(e) =>
                      setNotice({ ...notice, title: e.target.value })
                    }
                  />
                </Field>
                <Field label="Mensagem">
                  <textarea
                    rows={4}
                    maxLength={4000}
                    value={notice.body}
                    onChange={(e) =>
                      setNotice({ ...notice, body: e.target.value })
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Nome do evento">
                  <input
                    required
                    maxLength={120}
                    value={event.title}
                    onChange={(e) =>
                      setEvent({ ...event, title: e.target.value })
                    }
                  />
                </Field>
                <div className="form-row">
                  <Field label="Data e horário">
                    <input
                      type="datetime-local"
                      required
                      value={event.startsAt}
                      onChange={(e) =>
                        setEvent({ ...event, startsAt: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Local">
                    <input
                      maxLength={200}
                      value={event.location}
                      onChange={(e) =>
                        setEvent({ ...event, location: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Descrição">
                  <textarea
                    rows={3}
                    maxLength={4000}
                    value={event.description}
                    onChange={(e) =>
                      setEvent({ ...event, description: e.target.value })
                    }
                  />
                </Field>
                <p className="muted">
                  Protótipo: evento visível para integrantes ativos do Dojotai.
                </p>
              </>
            )}
            <MediaAttachmentControls
              items={media}
              onRemove={(index) =>
                setMedia((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              onSelect={(files) => void addMedia(files)}
            />
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <div className="creation-modal-actions">
              <button
                type="button"
                className="button button-quiet-light"
                onClick={closeComposer}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="button button-primary" disabled={busy}>
                {busy
                  ? "Publicando…"
                  : formType === "notice"
                    ? "Publicar aviso"
                    : "Publicar evento"}
              </button>
            </div>
          </form>
        </div>
      )}
      {error && !formType && <ErrorMessage>{error}</ErrorMessage>}
      {hasItems ? (
        <div className="info-list">
          {data.notices.map((item) => (
            <InfoFeedCard
              key={item.id}
              kind="Aviso"
              title={item.title}
              description={item.body}
              media={item.media}
              dateTime={item.createdAt}
              publishedAt={item.createdAt}
              author={item.author}
            />
          ))}
          {data.events.map((item) => (
            <InfoFeedCard
              key={item.id}
              kind="Evento"
              title={item.title}
              description={item.description}
              media={item.media}
              dateTime={item.startsAt}
              publishedAt={item.createdAt}
              author={item.author}
              location={item.location}
            />
          ))}
        </div>
      ) : (
        !formType && (
          <article className="feed-empty">
            <span className="feed-empty-icon">◉</span>
            <h2>O informativo começa aqui</h2>
            <p>
              Quando houver avisos ou eventos para sua comunidade, eles
              aparecerão nesta área.
            </p>
          </article>
        )
      )}
    </section>
  );
}

type InfoFeedData = {
  notices: {
    id: string;
    title: string;
    body: string;
    media: MediaAsset[];
    createdAt: string;
    author: { fullName: string; username: string; avatarUrl: string | null };
  }[];
  events: {
    id: string;
    title: string;
    description: string;
    media: MediaAsset[];
    startsAt: string;
    location: string;
    createdAt: string;
    author: { fullName: string; username: string; avatarUrl: string | null };
  }[];
};

type InfoFeedAuthor = {
  fullName: string;
  username: string;
  avatarUrl: string | null;
};
type InfoFeedCardProps = {
  kind: "Aviso" | "Evento";
  title: string;
  description: string;
  media: MediaAsset[];
  dateTime: string;
  publishedAt: string;
  author: InfoFeedAuthor;
  location?: string;
};

function InfoFeedCard({
  kind,
  title,
  description,
  media,
  dateTime,
  publishedAt,
  author,
  location,
}: InfoFeedCardProps) {
  const dateLabel = kind === "Evento" ? "Data e horário" : "Publicado";
  return (
    <article
      className={`content-card info-post ${kind === "Evento" ? "event-post" : "notice-post"}`}
    >
      <header className="info-post-author">
        <div className="info-author-avatar">
          {author.avatarUrl ? (
            <img src={author.avatarUrl} alt="" />
          ) : (
            author.fullName.trim().charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <strong>{author.fullName}</strong>
          <span>
            @{author.username} · publicado em {formatTimestamp(publishedAt)}
          </span>
        </div>
      </header>
      <div className="info-post-layout">
        <div className="info-post-media">
          {media.length ? (
            <MediaViewer items={media} altPrefix={title} />
          ) : (
            <div
              className="info-media-placeholder"
              aria-label="Sem mídia anexada"
            >
              goTAI
            </div>
          )}
        </div>
        <div className="info-post-copy">
          <div className="info-post-heading">
            <span className="info-kind-label">{kind}</span>
            <div className="featured-info-time">
              <small>{dateLabel}</small>
              <strong>
                {formatEventDate(dateTime)} · {formatTime(dateTime)}
              </strong>
            </div>
          </div>
          <h2>{title}</h2>
          {location && <p className="info-post-location">⌖ {location}</p>}
          <p className="info-post-description">
            {description || "Sem descrição adicional."}
          </p>
        </div>
      </div>
    </article>
  );
}
