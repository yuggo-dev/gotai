import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { HomePage } from "../public/HomePage";
import { ErrorMessage } from "../../components/ui";
import {
  MediaAttachmentControls,
  readMediaFiles,
  type MediaDraft,
} from "../../components/media";
import { SocialPostCard } from "./SocialPostCard";
import type { SocialPost } from "./types";

export function SocialPage() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const result = await api<{ posts: SocialPost[] }>("/api/social/posts");
      setPosts(result.posts);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (session?.membership) void load();
  }, [session, load]);
  if (!session?.membership) return <HomePage />;
  async function addFiles(files: FileList | null) {
    try {
      setMedia(await readMediaFiles(files, media));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({
          body,
          media: media.map(({ kind, dataUrl }) => ({ kind, dataUrl })),
        }),
      });
      setBody("");
      setMedia([]);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="member-content social-page">
      <form className="post-composer" onSubmit={(e) => void publish(e)}>
        <div className="composer-top">
          <div className="profile-avatar small-avatar">
            {session.user.avatarUrl ? (
              <img src={session.user.avatarUrl} alt="" />
            ) : (
              session.user.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <textarea
            aria-label="Texto da publicação"
            rows={3}
            maxLength={2000}
            placeholder={`O que você gostaria de compartilhar, @${session.user.username}?`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="composer-actions">
          <MediaAttachmentControls
            items={media}
            onRemove={(index) =>
              setMedia((current) =>
                current.filter((_, itemIndex) => itemIndex !== index),
              )
            }
            onSelect={(files) => void addFiles(files)}
          />
          <button
            className="button button-primary"
            disabled={busy || (!body.trim() && !media.length)}
          >
            {busy ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </form>
      {posts.length ? (
        <div className="social-post-list">
          {posts.map((post) => (
            <SocialPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <article className="feed-empty">
          <span className="feed-empty-icon">◎</span>
          <h2>Seu feed social está pronto</h2>
          <p>As publicações da comunidade aparecerão aqui.</p>
        </article>
      )}
    </section>
  );
}
