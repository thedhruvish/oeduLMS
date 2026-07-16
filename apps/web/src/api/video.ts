import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";

export interface VideoStatus {
  videoId: string;
  status: "UPLOADING" | "IDLE" | "SPLITTING" | "ENCODING" | "READY" | "ERROR";
  progress: number;
  masterUrl: string | null;
  errorMessage: string | null;
}

/**
 * Hook to poll and check the progress of the video transcoding pipeline.
 * Uses TanStack Query's native refetchInterval for automatic background polling
 * until status reaches "READY" or "ERROR".
 */
export function useGetVideoStatus(videoId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["video-status", videoId],
    queryFn: async () => {
      if (!videoId) return null;
      const { data } = await axiosClient.get<VideoStatus>(`/public/video/${videoId}/status`);
      return data;
    },
    enabled: enabled && !!videoId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "READY" || data.status === "ERROR")) {
        return false; // Stop polling once complete or failed
      }
      return 5000; // Poll every 5 seconds
    },
  });
}

/**
 * Hook to re-trigger the video transcoding pipeline.
 */
export function useReTriggerVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (videoId: string) => {
      const { data } = await axiosClient.post(`/admin/video/re-trigger`, { videoId });
      return data;
    },
    onSuccess: (_, videoId) => {
      queryClient.invalidateQueries({ queryKey: ["video-status", videoId] });
    },
  });
}
