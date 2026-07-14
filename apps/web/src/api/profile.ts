import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { authKeys } from "./auth";
import { ProfileUpdateType } from "@oedulms/validator";

export interface StudentProfileDetail {
  id: string;
  userId: string;
  bio?: string | null;
  headline?: string | null;
  phone?: string | null;
  country?: string | null;
  createdAt: string;
}

export interface StudentProfileResponse {
  user: {
    id: string;
    name: string;
    email?: string | null;
    image?: string | null;
  };
  profile: StudentProfileDetail;
}

export const profileKeys = {
  detail: ["student-profile"] as const,
  byUser: (userId: string) => ["user-profile", userId] as const,
};

async function fetchStudentProfile(): Promise<StudentProfileResponse> {
  const { data } = await axiosClient.get<StudentProfileResponse>("/dash/profile");
  return data;
}

async function fetchUserProfile(userId: string): Promise<StudentProfileResponse> {
  const { data } = await axiosClient.get<StudentProfileResponse>(`/dash/profile/${userId}`);
  return data;
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.byUser(userId),
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
  });
}

async function updateStudentProfile(payload: ProfileUpdateType): Promise<{ success: boolean }> {
  const { data } = await axiosClient.put<{ success: boolean }>("/dash/profile", payload);
  return data;
}

export function useStudentProfile() {
  return useQuery({
    queryKey: profileKeys.detail,
    queryFn: fetchStudentProfile,
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudentProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail });
      // Invalidate auth/me queries so the updated name propagates everywhere
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
