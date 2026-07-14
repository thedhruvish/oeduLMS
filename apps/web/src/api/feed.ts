import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { PostInput, CommentInput } from "@oedulms/validator";

export interface FeedAuthor {
  id: string;
  name: string;
  image?: string | null;
}

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  comment: string;
  parentId?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export interface FeedPost {
  id: string;
  content: string;
  image?: string | null;
  video?: string | null;
  createdAt: string;
  author: FeedAuthor;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  comments: FeedComment[];
}

export interface FeedResponse {
  posts: FeedPost[];
  allowStudentPosts: boolean;
}

export const feedKeys = {
  all: ["feed"] as const,
};

async function fetchFeedPosts(): Promise<FeedResponse> {
  const { data } = await axiosClient.get<FeedResponse>("/dash/posts");
  return data;
}

async function createPost(payload: PostInput): Promise<FeedPost> {
  const { data } = await axiosClient.post<FeedPost>("/dash/posts", payload);
  return data;
}

async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  const { data } = await axiosClient.post<{ liked: boolean }>(`/dash/posts/${postId}/like`);
  return data;
}

async function addComment(payload: CommentInput & { postId: string }): Promise<FeedComment> {
  const { postId, ...body } = payload;
  const { data } = await axiosClient.post<FeedComment>(`/dash/posts/${postId}/comment`, body);
  return data;
}

export function useFeedPosts() {
  return useQuery({
    queryKey: feedKeys.all,
    queryFn: fetchFeedPosts,
  });
}

import { useAuthStore } from "@/store/auth/auth-store";

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });

      const previousFeed = queryClient.getQueryData<FeedResponse>(feedKeys.all);

      const user = useAuthStore.getState().user;
      const newPost: FeedPost = {
        id: `temp-${Date.now()}`,
        content: payload.content,
        image: payload.image || null,
        video: payload.video || null,
        createdAt: new Date().toISOString(),
        author: {
          id: user?.id || "temp-user",
          name: user?.name || "Anonymous",
          image: user?.image || null,
        },
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        comments: [],
      };

      if (previousFeed) {
        queryClient.setQueryData<FeedResponse>(feedKeys.all, {
          ...previousFeed,
          posts: [newPost, ...previousFeed.posts],
        });
      }

      return { previousFeed };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData<FeedResponse>(feedKeys.all, context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleLike,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });

      const previousFeed = queryClient.getQueryData<FeedResponse>(feedKeys.all);

      if (previousFeed) {
        const updatedPosts = previousFeed.posts.map((post) => {
          if (post.id === postId) {
            const isLiked = !post.isLiked;
            return {
              ...post,
              isLiked,
              likesCount: isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
            };
          }
          return post;
        });

        queryClient.setQueryData<FeedResponse>(feedKeys.all, {
          ...previousFeed,
          posts: updatedPosts,
        });
      }

      return { previousFeed };
    },
    onError: (_err, _postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData<FeedResponse>(feedKeys.all, context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addComment,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });

      const previousFeed = queryClient.getQueryData<FeedResponse>(feedKeys.all);

      const user = useAuthStore.getState().user;
      const newComment: FeedComment = {
        id: `temp-comment-${Date.now()}`,
        postId: payload.postId,
        userId: user?.id || "temp-user",
        comment: payload.comment,
        parentId: payload.parentId || null,
        createdAt: new Date().toISOString(),
        user: {
          id: user?.id || "temp-user",
          name: user?.name || "Anonymous",
          image: user?.image || null,
        },
      };

      if (previousFeed) {
        const updatedPosts = previousFeed.posts.map((post) => {
          if (post.id === payload.postId) {
            return {
              ...post,
              commentsCount: post.commentsCount + 1,
              comments: [newComment, ...post.comments],
            };
          }
          return post;
        });

        queryClient.setQueryData<FeedResponse>(feedKeys.all, {
          ...previousFeed,
          posts: updatedPosts,
        });
      }

      return { previousFeed };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData<FeedResponse>(feedKeys.all, context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

async function deletePost(postId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.delete<{ success: boolean }>(`/dash/posts/${postId}`);
  return data;
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });

      const previousFeed = queryClient.getQueryData<FeedResponse>(feedKeys.all);

      if (previousFeed) {
        queryClient.setQueryData<FeedResponse>(feedKeys.all, {
          ...previousFeed,
          posts: previousFeed.posts.filter((post) => post.id !== postId),
        });
      }

      return { previousFeed };
    },
    onError: (_err, _postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData<FeedResponse>(feedKeys.all, context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}
