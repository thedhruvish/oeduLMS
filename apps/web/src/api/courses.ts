import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { coursesKeys } from "./query-keys";
import type { CourseInput, FaqInput } from "@oedulms/validator";
import type { PublicCourse, PublicCourseDetail, PublicSection, PublicFaq } from "@/types/public";

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

export const publicCoursesQueryOptions = {
  queryKey: ["public-courses"],
  queryFn: async (): Promise<PublicCourse[]> => {
    const { data } = await axiosClient.get<PublicCourse[]>("/public/courses");
    return (data || []).map((c) => ({
      ...c,
      price: c.price / 100,
      discountPrice: c.discountPrice ? c.discountPrice / 100 : null,
    }));
  },
  staleTime: 60 * 1000, // Stale-while-revalidate: Instant SSG display + background fresh data check
  gcTime: 30 * 60 * 1000,
};

export const publicCourseDetailQueryOptions = (idOrSlug: string) => ({
  queryKey: ["public-course-detail", idOrSlug],
  queryFn: async (): Promise<PublicCourseDetail> => {
    const { data } = await axiosClient.get<PublicCourseDetail>(`/public/courses/${idOrSlug}`);
    return {
      ...data,
      price: data.price / 100,
      discountPrice: data.discountPrice ? data.discountPrice / 100 : null,
    };
  },
  enabled: !!idOrSlug,
  retry: false,
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000,
});

export function usePublicCourses() {
  return useQuery<PublicCourse[]>(publicCoursesQueryOptions);
}

export function usePublicCourseDetails(idOrSlug: string) {
  return useQuery<PublicCourseDetail>(publicCourseDetailQueryOptions(idOrSlug));
}

export const publicCourseCurriculumQueryOptions = (idOrSlug: string) => ({
  queryKey: ["public-course-curriculum", idOrSlug],
  queryFn: async (): Promise<PublicSection[]> => {
    const { data } = await axiosClient.get<PublicSection[]>(
      `/public/courses/${idOrSlug}/curriculum`
    );
    return data || [];
  },
  enabled: !!idOrSlug,
  retry: false,
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000,
});

export const publicCourseFaqsQueryOptions = (idOrSlug: string) => ({
  queryKey: ["public-course-faqs", idOrSlug],
  queryFn: async (): Promise<PublicFaq[]> => {
    const { data } = await axiosClient.get<PublicFaq[]>(`/public/courses/${idOrSlug}/faqs`);
    return data || [];
  },
  enabled: !!idOrSlug,
  retry: false,
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000,
});

export function usePublicCourseCurriculum(idOrSlug: string) {
  return useQuery<PublicSection[]>(publicCourseCurriculumQueryOptions(idOrSlug));
}

export function usePublicCourseFaqs(idOrSlug: string) {
  return useQuery<PublicFaq[]>(publicCourseFaqsQueryOptions(idOrSlug));
}
