import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth";
import { ErrorMessage } from "../../components/ui";
import { MediaViewer } from "../../components/media";
import { formatTimestamp } from "../../lib/format";
import type { SocialComment, SocialPost } from "./types";

export function SocialPostCard({ post }: { post: SocialPost }) {
  const { session } = useAuth();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !commentsLoaded) {
      try {
        const result = await api<{ comments: SocialComment[] }>(
          `/api/social/posts/${post.id}/comments`,
        );
        setComments(result.comments);
        setCommentsLoaded(true);
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikesCount((count) => Math.max(0, count + (next ? 1 : -1)));
    setError("");
    try {
      await api(`/api/social/posts/${post.id}/likes`, {
        method: next ? "POST" : "DELETE",
      });
    } catch (e) {
      setLiked(!next);
      setLikesCount((count) => Math.max(0, count + (next ? -1 : 1)));
      setError((e as Error).message);
    }
  }
  async function addComment(event: FormEvent) {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const comment = await api<SocialComment>(
        `/api/social/posts/${post.id}/comments`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setComments((current) => [...current, comment]);
      setCommentsLoaded(true);
      setCommentsCount((count) => count + 1);
      setCommentText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveComment(comment: SocialComment) {
    const body = editText.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/social/posts/${post.id}/comments/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body }),
      });
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id ? { ...item, body } : item,
        ),
      );
      setEditingComment(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeComment(comment: SocialComment) {
    setError("");
    try {
      await api(`/api/social/posts/${post.id}/comments/${comment.id}`, {
        method: "DELETE",
      });
      setComments((current) =>
        current.filter((item) => item.id !== comment.id),
      );
      setCommentsCount((count) => Math.max(0, count - 1));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <article className="social-post">
      <div className="post-author">
        <div className="profile-avatar small-avatar">
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" />
          ) : (
            post.author.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <strong>{post.author.fullName}</strong>
          <span>
            @{post.author.username} · {formatTimestamp(post.createdAt)}
          </span>
        </div>
      </div>
      {post.body && <p className="post-body">{post.body}</p>}
      <MediaViewer items={post.media} altPrefix="Mídia da publicação" />
      <div className="post-engagement" aria-label="Interações da publicação">
        <button
          className={liked ? "post-action liked" : "post-action"}
          aria-pressed={liked}
          onClick={() => void toggleLike()}
        >
          <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
          <strong>{likesCount}</strong>
          <span>{likesCount === 1 ? "curtida" : "curtidas"}</span>
        </button>
        <button
          className={commentsOpen ? "post-action active" : "post-action"}
          aria-expanded={commentsOpen}
          onClick={() => void openComments()}
        >
          <span aria-hidden="true">▤</span>
          <strong>{commentsCount}</strong>
          <span>{commentsCount === 1 ? "comentário" : "comentários"}</span>
        </button>
      </div>
      {commentsOpen && (
        <section
          className="comments-panel"
          aria-label="Comentários da publicação"
        >
          <h3>
            Comentários <span>{commentsCount}</span>
          </h3>
          {comments.length ? (
            <div className="comment-list">
              {comments.map((comment) => (
                <article className="comment-row" key={comment.id}>
                  <div className="comment-avatar">
                    {comment.author.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt="" />
                    ) : (
                      comment.author.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="comment-content">
                    <div className="comment-meta">
                      <strong>{comment.author.fullName}</strong>
                      <span>
                        @{comment.author.username} ·{" "}
                        {formatTimestamp(comment.createdAt)}
                      </span>
                    </div>
                    {editingComment === comment.id ? (
                      <>
                        <textarea
                          aria-label="Editar comentário"
                          maxLength={1000}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <div className="comment-controls">
                          <button
                            onClick={() => void saveComment(comment)}
                            disabled={busy}
                          >
                            Salvar
                          </button>
                          <button onClick={() => setEditingComment(null)}>
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>{comment.body}</p>
                    )}
                  </div>
                  {session?.user.id === comment.author.userId &&
                    editingComment !== comment.id && (
                      <div className="comment-own-actions">
                        <button
                          aria-label="Editar comentário"
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditText(comment.body);
                          }}
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Excluir comentário"
                          onClick={() => void removeComment(comment)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                </article>
              ))}
            </div>
          ) : (
            <p className="comments-empty">
              Ainda não há comentários. Comece a conversa.
            </p>
          )}
          <form
            className="comment-composer"
            onSubmit={(e) => void addComment(e)}
          >
            <textarea
              aria-label="Escreva um comentário"
              maxLength={1000}
              rows={2}
              placeholder="Escreva um comentário…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              className="button button-primary"
              disabled={busy || !commentText.trim()}
            >
              {busy ? "Enviando…" : "Comentar"}
            </button>
          </form>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </section>
      )}
    </article>
  );
}
