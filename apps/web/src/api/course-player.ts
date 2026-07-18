import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { coursePlayerKeys } from "./query-keys";
import type { AuthState } from "./auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LectureResource {
  id: string;
  title: string;
  type: string;
  url: string;
  size: number | null;
}

export interface LectureProgress {
  watchSeconds: number;
  lastPosition: number;
  completed: boolean;
  updatedAt?: string;
}

export interface PlayerLecture {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  description: string | null;
  videoUrl: string;
  hlsUrl: string;
  thumbnail: string | null;
  duration: number;
  isPreview: boolean;
  position: number;
  resources: LectureResource[];
  progress: LectureProgress;
}

export interface PlayerSection {
  id: string;
  title: string;
  description: string | null;
  position: number;
  totalVideos: number;
  watchedVideos: number;
  lectures: PlayerLecture[];
}

export interface CoursePlayerData {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    shortDescription: string | null;
  };
  enrollment: {
    id: string;
    progress: number;
    status: string;
  };
  sections: PlayerSection[];
  stats: {
    totalLectures: number;
    completedLectures: number;
  };
}

export interface LectureComment {
  id: string;
  content: string;
  parentId: string | null;
  isEdited: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface LectureAnswer {
  id: string;
  content: string;
  isInstructorAnswer: boolean;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface LectureQuestion {
  id: string;
  title: string;
  description: string;
  status: string;
  viewsCount: number;
  answersCount: number;
  acceptedAnswerId: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    image: string | null;
  };
  answers: LectureAnswer[];
}

// ─── Course player data ──────────────────────────────────────────────────────

export function useCoursePlayer(courseId: string) {
  return useQuery({
    queryKey: coursePlayerKeys.course(courseId),
    queryFn: async () => {
      const { data } = await axiosClient.get<CoursePlayerData>(`/dash/courses/${courseId}`);
      return data;
    },
    enabled: !!courseId,
    retry: false,
  });
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function useUpdateLectureProgress(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lectureId,
      ...payload
    }: {
      lectureId: string;
      watchSeconds?: number;
      lastPosition?: number;
      completed?: boolean;
    }) => {
      const { data } = await axiosClient.put(
        `/dash/courses/${courseId}/lectures/${lectureId}/progress`,
        payload
      );
      return data as {
        progress: LectureProgress & { lectureId: string };
        courseProgress: number;
      };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CoursePlayerData>(coursePlayerKeys.course(courseId), (old) => {
        if (!old) return old;
        const newSections = old.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((lecture) => {
            if (lecture.id === variables.lectureId) {
              return {
                ...lecture,
                progress: {
                  ...lecture.progress,
                  watchSeconds: data.progress.watchSeconds,
                  lastPosition: data.progress.lastPosition,
                  completed: data.progress.completed,
                },
              };
            }
            return lecture;
          }),
        }));

        const totalPublishedLectures = newSections.flatMap((s) => s.lectures).length;
        const completedLectures = newSections
          .flatMap((s) => s.lectures)
          .filter((l) => l.progress.completed).length;

        return {
          ...old,
          enrollment: {
            ...old.enrollment,
            progress: data.courseProgress,
          },
          sections: newSections,
          stats: {
            totalLectures: totalPublishedLectures,
            completedLectures,
          },
        };
      });
    },
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export function useLectureComments(courseId: string, lectureId: string) {
  return useQuery({
    queryKey: coursePlayerKeys.comments(courseId, lectureId),
    queryFn: async () => {
      const { data } = await axiosClient.get<LectureComment[]>(
        `/dash/courses/${courseId}/lectures/${lectureId}/comments`
      );
      return data;
    },
    enabled: !!courseId && !!lectureId,
  });
}

export function useAddLectureComment(courseId: string, lectureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { content: string; parentId?: string | null }) => {
      const { data } = await axiosClient.post<LectureComment>(
        `/dash/courses/${courseId}/lectures/${lectureId}/comments`,
        payload
      );
      return data;
    },
    onMutate: async (newCommentPayload) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: coursePlayerKeys.comments(courseId, lectureId),
      });

      // Snapshot the previous comments
      const previousComments = queryClient.getQueryData<LectureComment[]>(
        coursePlayerKeys.comments(courseId, lectureId)
      );

      // Get the current user profile from the query client cache
      const authState = queryClient.getQueryData<AuthState>(["auth", "me"]);
      const currentUser = authState?.user || {
        id: "temp-user-id",
        name: "You",
        image: null,
      };

      // Create an optimistic comment/reply object
      const optimisticComment: LectureComment = {
        id: `optimistic-${Date.now()}`,
        content: newCommentPayload.content,
        parentId: newCommentPayload.parentId || null,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image || null,
        },
      };

      // Optimistically update the list
      queryClient.setQueryData<LectureComment[]>(
        coursePlayerKeys.comments(courseId, lectureId),
        (old) => [...(old || []), optimisticComment]
      );

      return { previousComments };
    },
    onError: (_err, _newComment, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          coursePlayerKeys.comments(courseId, lectureId),
          context.previousComments
        );
      }
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({
        queryKey: coursePlayerKeys.comments(courseId, lectureId),
      });
    },
  });
}

export function useDeleteLectureComment(courseId: string, lectureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await axiosClient.delete(
        `/dash/courses/${courseId}/lectures/${lectureId}/comments/${commentId}`
      );
      return data;
    },
    onMutate: async (deletedCommentId) => {
      await queryClient.cancelQueries({
        queryKey: coursePlayerKeys.comments(courseId, lectureId),
      });

      const previousComments = queryClient.getQueryData<LectureComment[]>(
        coursePlayerKeys.comments(courseId, lectureId)
      );

      queryClient.setQueryData<LectureComment[]>(
        coursePlayerKeys.comments(courseId, lectureId),
        (old) => {
          if (!old) return [];
          return old.filter((c) => c.id !== deletedCommentId && c.parentId !== deletedCommentId);
        }
      );

      return { previousComments };
    },
    onError: (_err, _deletedCommentId, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          coursePlayerKeys.comments(courseId, lectureId),
          context.previousComments
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: coursePlayerKeys.comments(courseId, lectureId),
      });
    },
  });
}

// ─── Q&A ─────────────────────────────────────────────────────────────────────

export function useLectureQuestions(courseId: string, lectureId: string) {
  return useQuery({
    queryKey: coursePlayerKeys.questions(courseId, lectureId),
    queryFn: async () => {
      const { data } = await axiosClient.get<LectureQuestion[]>(
        `/dash/courses/${courseId}/lectures/${lectureId}/questions`
      );
      return data;
    },
    enabled: !!courseId && !!lectureId,
  });
}

export function useAddLectureQuestion(courseId: string, lectureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const { data } = await axiosClient.post<LectureQuestion>(
        `/dash/courses/${courseId}/lectures/${lectureId}/questions`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coursePlayerKeys.questions(courseId, lectureId),
      });
    },
  });
}

export function useAddLectureAnswer(courseId: string, lectureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, content }: { questionId: string; content: string }) => {
      const { data } = await axiosClient.post<LectureAnswer>(
        `/dash/courses/${courseId}/questions/${questionId}/answers`,
        { content }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coursePlayerKeys.questions(courseId, lectureId),
      });
    },
  });
}

// ─── User Settings ───────────────────────────────────────────────────────────

export interface UserSettings {
  userId: string;
  playbackSpeed: string;
  lastWatchedLectures: Record<string, string>;
  updatedAt: string;
}

export const userSettingsKeys = {
  all: ["user-settings"] as const,
};

export function useUserSettings() {
  return useQuery({
    queryKey: userSettingsKeys.all,
    queryFn: async () => {
      const { data } = await axiosClient.get("/dash/profile/settings/user");
      return data as UserSettings;
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playbackSpeed,
      lastWatchedLectures,
    }: {
      playbackSpeed?: string;
      lastWatchedLectures?: Record<string, string>;
    }) => {
      const { data } = await axiosClient.put("/dash/profile/settings/user", {
        playbackSpeed,
        lastWatchedLectures,
      });
      return data as UserSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<UserSettings>(userSettingsKeys.all, data);
    },
  });
}
