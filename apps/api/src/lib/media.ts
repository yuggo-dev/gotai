export type MediaItem = { kind: "image" | "audio" | "video"; dataUrl: string };

export const mediaSchema = {
  type: "array",
  maxItems: 4,
  items: {
    type: "object",
    required: ["kind", "dataUrl"],
    additionalProperties: false,
    properties: {
      kind: { type: "string", enum: ["image", "audio", "video"] },
      dataUrl: { type: "string", minLength: 30, maxLength: 7000000 },
    },
  },
} as const;

export function validateMedia(media: MediaItem[]): string | null {
  let total = 0;
  for (const item of media) {
    const match = item.dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (
      !match ||
      (item.kind === "image" && !match[1].startsWith("image/")) ||
      (item.kind === "audio" && !match[1].startsWith("audio/")) ||
      (item.kind === "video" && !match[1].startsWith("video/"))
    ) {
      return "Um dos arquivos não corresponde ao tipo de mídia selecionado.";
    }
    total += Buffer.from(match[2], "base64").byteLength;
  }
  return total > 5 * 1024 * 1024
    ? "O total de mídias deve ter até 5 MB."
    : null;
}
