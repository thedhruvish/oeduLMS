import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { coursesKeys } from "@/api/query-keys";

export interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  price: number;
  status: "DRAFT" | "PUBLISHED";
  instructorId: string;
}

export interface CreateCoursePayload {
  title: string;
  price: number;
  shortDescription?: string;
  description?: string;
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  status?: "DRAFT" | "PUBLISHED";
}

// Fetcher functions colocated with the query hooks
async function fetchCourses(filters: Record<string, unknown> = {}): Promise<Course[]> {
  const { data } = await axiosClient.get<Course[]>("/api/courses", { params: filters });
  return data;
}

async function fetchCourseById(id: string): Promise<Course> {
  const { data } = await axiosClient.get<Course>(`/api/courses/${id}`);
  return data;
}

async function createCourse(payload: CreateCoursePayload): Promise<Course> {
  const { data } = await axiosClient.post<Course>("/api/courses", payload);
  return data;
}

async function updateCourse(id: string, payload: UpdateCoursePayload): Promise<Course> {
  const { data } = await axiosClient.put<Course>(`/api/courses/${id}`, payload);
  return data;
}

// Custom hooks wrapping TanStack Query
export function useCourses(filters: Record<string, unknown> = {}) {
  const query = useQuery({
    queryKey: coursesKeys.list(filters),
    queryFn: () => fetchCourses(filters),
  });

  return {
    ...query,
    isEmpty: query.isSuccess && query.data.length === 0,
    isBackgroundRefetching: query.isFetching && !query.isLoading,
  };
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: coursesKeys.detail(id),
    queryFn: () => fetchCourseById(id),
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: coursesKeys.lists(),
      });
    },
  });
}

export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCoursePayload) => updateCourse(id, payload),

    onMutate: async (newCourseData) => {
      await queryClient.cancelQueries({
        queryKey: coursesKeys.detail(id),
      });
      await queryClient.cancelQueries({
        queryKey: coursesKeys.lists(),
      });

      const previousCourse = queryClient.getQueryData<Course>(coursesKeys.detail(id));

      if (previousCourse) {
        queryClient.setQueryData<Course>(coursesKeys.detail(id), {
          ...previousCourse,
          ...newCourseData,
        });
      }

      return { previousCourse };
    },

    onError: (_err, _newCourseData, context) => {
      if (context?.previousCourse) {
        queryClient.setQueryData<Course>(coursesKeys.detail(id), context.previousCourse);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: coursesKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: coursesKeys.lists(),
      });
    },
  });
}
