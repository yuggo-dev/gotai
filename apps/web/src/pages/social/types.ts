import type { MediaAsset } from "../../components/media";

export type SocialComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    userId: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
};
export type SocialPost = {
  id: string;
  body: string;
  media: MediaAsset[];
  createdAt: string;
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  author: {
    userId: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
};
