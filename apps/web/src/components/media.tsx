import { fileToDataUrl } from "../lib/format";

type MediaKind = "image" | "audio" | "video";
export type MediaDraft = {
  kind: MediaKind;
  dataUrl: string;
  name: string;
  size: number;
};
export type MediaAsset = { kind: MediaKind; dataUrl: string };

export async function readMediaFiles(
  files: FileList | null,
  current: MediaDraft[],
): Promise<MediaDraft[]> {
  if (!files) return current;
  const selected = Array.from(files).slice(0, Math.max(0, 4 - current.length));
  if (
    current.reduce((total, item) => total + item.size, 0) +
      selected.reduce((total, file) => total + file.size, 0) >
    5 * 1024 * 1024
  ) {
    throw new Error("O total de mídias deve ter até 5 MB.");
  }
  return [
    ...current,
    ...(await Promise.all(
      selected.map(async (file) => {
        const kind: MediaKind | null = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "audio"
            : file.type.startsWith("video/")
              ? "video"
              : null;
        if (!kind)
          throw new Error("Escolha fotos, áudios ou vídeos compatíveis.");
        return {
          kind,
          dataUrl: await fileToDataUrl(file),
          name: file.name,
          size: file.size,
        };
      }),
    )),
  ];
}

export function MediaAttachmentControls({
  items,
  onRemove,
  onSelect,
}: {
  items: MediaDraft[];
  onRemove: (index: number) => void;
  onSelect: (files: FileList | null) => void;
}) {
  return (
    <div className="media-controls">
      <div className="attachment-list">
        {items.map((item, index) => (
          <span key={`${item.name}-${index}`}>
            {item.kind === "image" ? "▧" : item.kind === "audio" ? "♫" : "▶"}{" "}
            {item.name}
            <button
              type="button"
              aria-label={`Remover ${item.name}`}
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <label className="attach-button">
        ＋ Adicionar mídia
        <input
          type="file"
          accept="image/*,audio/*,video/*"
          multiple
          hidden
          disabled={items.length >= 4}
          onChange={(e) => {
            onSelect(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}

export function MediaViewer({
  items,
  altPrefix = "Mídia",
}: {
  items: MediaAsset[];
  altPrefix?: string;
}) {
  if (!items.length) return null;
  return (
    <div className="post-media">
      {items.map((item, index) =>
        item.kind === "image" ? (
          <img
            key={index}
            src={item.dataUrl}
            alt={`${altPrefix} ${index + 1}`}
          />
        ) : item.kind === "audio" ? (
          <audio key={index} controls src={item.dataUrl} />
        ) : (
          <video key={index} controls src={item.dataUrl} />
        ),
      )}
    </div>
  );
}

export function MediaPreview({
  items,
  title,
}: {
  items: MediaAsset[];
  title: string;
}) {
  if (!items.length) return null;
  return (
    <div
      className="content-media-preview"
      aria-label={`${items.length} mídia(s) anexada(s)`}
    >
      {items
        .slice(0, 3)
        .map((item, index) =>
          item.kind === "image" ? (
            <img
              key={index}
              src={item.dataUrl}
              alt={`${title} · foto ${index + 1}`}
            />
          ) : item.kind === "video" ? (
            <video
              key={index}
              src={item.dataUrl}
              aria-label={`${title} · vídeo`}
            />
          ) : (
            <span key={index}>♫ Áudio</span>
          ),
        )}
      {items.length > 3 && <span>+{items.length - 3}</span>}
    </div>
  );
}
