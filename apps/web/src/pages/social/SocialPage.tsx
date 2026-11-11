import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage } from "../../components/ui";
import { MediaViewer, type MediaAsset } from "../../components/media";
import { formatEventDate, formatTime, formatTimestamp } from "../../lib/format";
import { SocialPostCard } from "./SocialPostCard";
import type { SocialPost } from "./types";

export function SocialPage() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [notices, setNotices] = useState<FeedNotice[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<FeedEvent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [socialResult, informationResult] = await Promise.all([
        api<{ posts: SocialPost[] }>("/api/social/posts"),
        api<{ notices: FeedNotice[]; events: FeedEvent[] }>("/api/informativo"),
      ]);
      setPosts(socialResult.posts);
      setNotices(informationResult.notices);
      setEvents(informationResult.events);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (session?.membership) void load();
  }, [session, load]);
  useEffect(() => {
    if (!selectedEvent) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEvent(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedEvent]);
  if (!session?.membership) return <HomePage />;
  const feedItems = buildHomeFeed(posts, notices);
  const upcomingEvents = events
    .filter((event) => Date.parse(event.startsAt) >= Date.now())
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  return (
    <section className="member-content social-page home-feed-page">
      {upcomingEvents.length > 0 && (
        <>
          <section
            className="home-events-section"
            aria-label="Próximos eventos"
          >
            <p className="home-events-title">Atividades:</p>
            <div className="home-events-track">
              {upcomingEvents.map((event) => (
                <EventCarouselCard
                  key={event.id}
                  event={event}
                  onSelect={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          </section>
          <div className="home-events-divider" aria-hidden="true" />
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {loading ? (
        <p className="home-feed-loading">Carregando publicações…</p>
      ) : feedItems.length ? (
        <div className="social-post-list home-feed-list">
          {feedItems.map((item) => {
            if (item.type === "social") {
              return <SocialPostCard key={item.key} post={item.post} />;
            }
            return <NoticeFeedCard key={item.key} notice={item.notice} />;
          })}
        </div>
      ) : (
        <article className="feed-empty">
          <span className="feed-empty-icon">⌂</span>
          <h2>Seu início está pronto</h2>
          <p>As publicações e avisos da comunidade aparecerão aqui.</p>
        </article>
      )}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </section>
  );
}

type FeedAuthor = Pick<SocialPost["author"], "fullName" | "username" | "avatarUrl">;
type FeedNotice = {
  id: string;
  title: string;
  body: string;
  media: MediaAsset[];
  createdAt: string;
  author: FeedAuthor;
};
export type FeedEvent = {
  id: string;
  title: string;
  description: string;
  media: MediaAsset[];
  startsAt: string;
  location: string;
  createdAt: string;
  author: FeedAuthor;
};
type HomeFeedItem =
  | { type: "social"; key: string; post: SocialPost }
  | { type: "notice"; key: string; notice: FeedNotice };

function buildHomeFeed(
  posts: SocialPost[],
  notices: FeedNotice[],
): HomeFeedItem[] {
  const contentItems: Array<Extract<HomeFeedItem, { type: "social" | "notice" }>> = [
    ...posts.map((post) => ({
      type: "social" as const,
      key: `social-${post.id}`,
      post,
    })),
    ...notices.map((notice) => ({
      type: "notice" as const,
      key: `notice-${notice.id}`,
      notice,
    })),
  ].sort((left, right) => {
    const leftTime =
      left.type === "social" ? left.post.createdAt : left.notice.createdAt;
    const rightTime =
      right.type === "social" ? right.post.createdAt : right.notice.createdAt;
    return Date.parse(rightTime) - Date.parse(leftTime);
  });
  return contentItems;
}

function NoticeFeedCard({ notice }: { notice: FeedNotice }) {
  return (
    <article className="social-post notice-feed-card">
      <header className="post-author">
        <div className="profile-avatar small-avatar">
          {notice.author.avatarUrl ? (
            <img src={notice.author.avatarUrl} alt="" />
          ) : (
            notice.author.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <strong>{notice.author.fullName}</strong>
          <span>
            @{notice.author.username} · {formatTimestamp(notice.createdAt)}
          </span>
        </div>
        <span className="home-feed-kind">Aviso</span>
      </header>
      <h2 className="notice-feed-title">{notice.title}</h2>
      {notice.body && <p className="post-body">{notice.body}</p>}
      <MediaViewer items={notice.media} altPrefix={notice.title} />
    </article>
  );
}

function EventCarouselCard({
  event,
  onSelect,
}: {
  event: FeedEvent;
  onSelect: () => void;
}) {
  const poster = event.media.find((item) => item.kind === "image");
  return (
    <button
      type="button"
      className="event-carousel-card"
      onClick={onSelect}
      aria-label={`Abrir detalhes do evento ${event.title}`}
    >
      <div className="event-carousel-cover">
        {poster ? (
          <MediaViewer items={[poster]} altPrefix={event.title} />
        ) : (
          <div className="event-carousel-placeholder" aria-hidden="true">
            go!TAI
          </div>
        )}
      </div>
      <div className="event-carousel-copy">
        <span className="home-feed-kind">Evento</span>
        <h3>{event.title}</h3>
        <p className="event-carousel-location">⌖ {event.location || "Dojotai"}</p>
        <p className="event-carousel-date">
          {formatEventDate(event.startsAt)} · {formatTime(event.startsAt)}
        </p>
      </div>
    </button>
  );
}

export function EventDetailsModal({
  event,
  onClose,
}: {
  event: FeedEvent;
  onClose: () => void;
}) {
  return (
    <div
      className="event-details-backdrop"
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        className="event-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <header className="event-details-header">
          <div>
            <p className="eyebrow">Evento da comunidade</p>
            <h2 id="event-details-title">{event.title}</h2>
          </div>
          <button
            type="button"
            className="close-button"
            aria-label="Fechar detalhes do evento"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {event.media.length > 0 && (
          <div className="event-details-media">
            <MediaViewer items={event.media} altPrefix={event.title} />
          </div>
        )}
        <div className="event-details-meta">
          <p>
            <strong>Quando</strong>
            <span>{formatEventDate(event.startsAt)} · {formatTime(event.startsAt)}</span>
          </p>
          <p>
            <strong>Onde</strong>
            <span>{event.location || "Dojotai"}</span>
          </p>
        </div>
        <div className="event-details-description">
          <h3>Sobre o evento</h3>
          <p>{event.description || "Sem descrição adicional."}</p>
        </div>
        <footer className="event-details-author">
          <div className="profile-avatar small-avatar">
            {event.author.avatarUrl ? (
              <img src={event.author.avatarUrl} alt="" />
            ) : (
              event.author.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <span>
            <strong>{event.author.fullName}</strong>
            <small>Publicado em {formatTimestamp(event.createdAt)}</small>
          </span>
        </footer>
      </section>
    </div>
  );
}
