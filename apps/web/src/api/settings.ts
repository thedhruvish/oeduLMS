import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";

export interface SystemSettings {
  allowStudentPosts: boolean;
}

export function useSystemSettings() {
  return useQuery<SystemSettings>({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data } = await axiosClient.get<SystemSettings>("/admin/settings");
      return data;
    },
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SystemSettings) => {
      const { data } = await axiosClient.post("/admin/settings", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export interface UserSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
}

export interface UserSessionResponse {
  sessions: UserSession[];
  currentLocation: {
    ip: string | null;
    city: string | null;
    country: string | null;
  };
}

export function useActiveSessions() {
  return useQuery<UserSessionResponse>({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const { data } = await axiosClient.get<UserSessionResponse>("/admin/settings/sessions");
      return data;
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosClient.post("/admin/settings/sessions/revoke", { id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
    },
  });
}
