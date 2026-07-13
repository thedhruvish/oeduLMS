import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { enrollmentsKeys } from "./query-keys";
import type { EnrollmentInput } from "@oedulms/validator";

export interface Enrollment {
  id: string;
  progress: number;
  status: "active" | "completed" | "refunded";
  createdAt: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
  };
  student: {
    id: string;
    name: string;
    email: string;
  };
  payment?: {
    id: string;
    amount: number;
  } | null;
}

async function fetchEnrollments(): Promise<Enrollment[]> {
  const { data } = await axiosClient.get<Enrollment[]>("/admin/enrollments");
  return data;
}

async function createEnrollment(payload: EnrollmentInput): Promise<Enrollment> {
  const { data } = await axiosClient.post<Enrollment>("/admin/enrollments", payload);
  return data;
}

async function updateEnrollment({
  id,
  payload,
}: {
  id: string;
  payload: Pick<EnrollmentInput, "status">;
}): Promise<Enrollment> {
  const { data } = await axiosClient.put<Enrollment>(`/admin/enrollments/${id}`, payload);
  return data;
}

async function deleteEnrollment(id: string): Promise<Enrollment> {
  const { data } = await axiosClient.delete<Enrollment>(`/admin/enrollments/${id}`);
  return data;
}

export function useEnrollments() {
  return useQuery({
    queryKey: enrollmentsKeys.lists(),
    queryFn: fetchEnrollments,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all });
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all });
    },
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all });
    },
  });
}

async function refundEnrollment({
  id,
  amount,
}: {
  id: string;
  amount?: number;
}): Promise<Enrollment> {
  const { data } = await axiosClient.post<Enrollment>(`/admin/enrollments/${id}/refund`, {
    amount,
  });
  return data;
}

export function useRefundEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refundEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enrollmentsKeys.all });
    },
  });
}

export function useCheckEnrollment(courseIdOrSlug: string, enabled: boolean) {
  return useQuery<{ isEnrolled: boolean }>({
    queryKey: ["check-enrollment", courseIdOrSlug],
    queryFn: async () => {
      const { data } = await axiosClient.get<{ isEnrolled: boolean }>(
        `/dash/enrollments/${courseIdOrSlug}/check`
      );
      return data;
    },
    enabled: enabled && !!courseIdOrSlug,
    retry: false,
  });
}
