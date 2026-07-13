import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { coursesKeys } from "./query-keys";
import type { CourseInput, FaqInput } from "@oedulms/validator";

export interface CourseFaq {
  id: string;
  courseId: string;
  question: string;
  answer: string;
  position: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  currency: string;
  thumbnail?: string | null;
  trailerVideo?: string | null;
  durationSeconds: number;
  totalLectures: number;
  certificateEnabled: boolean;
  status: "DRAFT" | "PUBLISHED";
  language?: string;
  validateDays?: number;
  instructorId: string;
  faqs?: CourseFaq[];
}

export type { CourseInput, FaqInput };
export type CreateCoursePayload = CourseInput;
export type UpdateCoursePayload = Partial<CourseInput>;

function normalizeCourse(c: Course): Course {
  return {
    ...c,
    price: c.price / 100, // convert cents → dollars
    discountPrice: c.discountPrice ? c.discountPrice / 100 : null,
  };
}

async function fetchCourses(): Promise<Course[]> {
  const { data } = await axiosClient.get<Course[]>("/admin/courses");
  return data.map(normalizeCourse);
}

async function fetchCourseById(id: string): Promise<Course> {
  const { data } = await axiosClient.get<Course>(`/admin/courses/${id}`);
  return normalizeCourse(data);
}

async function createCourse(payload: CreateCoursePayload): Promise<Course> {
  const { data } = await axiosClient.post<Course>("/admin/courses", payload);
  return normalizeCourse(data);
}

async function updateCourse(id: string, payload: UpdateCoursePayload): Promise<Course> {
  const { data } = await axiosClient.put<Course>(`/admin/courses/${id}`, payload);
  return normalizeCourse(data);
}

async function deleteCourse(id: string): Promise<void> {
  await axiosClient.delete(`/admin/courses/${id}`);
}

export function useCourses() {
  const query = useQuery({
    queryKey: coursesKeys.lists(),
    queryFn: fetchCourses,
  });
  return {
    ...query,
    isEmpty: query.isSuccess && query.data.length === 0,
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
      queryClient.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}

export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCoursePayload) => updateCourse(id, payload),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: coursesKeys.detail(id) });
      const prev = queryClient.getQueryData<Course>(coursesKeys.detail(id));
      if (prev) {
        queryClient.setQueryData<Course>(coursesKeys.detail(id), { ...prev, ...newData } as Course);
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData<Course>(coursesKeys.detail(id), context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: coursesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coursesKeys.lists() });
    },
  });
}
