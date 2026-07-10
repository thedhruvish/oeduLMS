import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { studentsKeys } from "./query-keys";

export interface Student {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  banAt?: string | null;
  banReason?: string | null;
  bio?: string | null;
  phone?: string | null;
  country?: string | null;
  enrollmentsCount: number;
}

async function fetchStudents(): Promise<Student[]> {
  const { data } = await axiosClient.get<Student[]>("/api/admin/students");
  return data;
}

async function banStudent({ id, reason }: { id: string; reason?: string }): Promise<void> {
  await axiosClient.post(`/api/admin/students/${id}/ban`, { reason });
}

async function unbanStudent(id: string): Promise<void> {
  await axiosClient.post(`/api/admin/students/${id}/unban`);
}

export function useStudents() {
  const query = useQuery({
    queryKey: studentsKeys.lists(),
    queryFn: fetchStudents,
  });
  return {
    ...query,
    isEmpty: query.isSuccess && query.data.length === 0,
  };
}

export function useBanStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: banStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}

export function useUnbanStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unbanStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
  });
}
