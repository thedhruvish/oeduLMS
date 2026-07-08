import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { curriculumKeys } from "./query-keys";
import type { SectionInput, LectureInput } from "@oedulms/validator";

export interface Lecture {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  description: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  duration: number;
  isPreview: boolean;
  isPublished: boolean;
  position: number;
  createdAt: string;
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  isPublished: boolean;
  createdAt: string;
  lectures: Lecture[];
}

// 1. Hook to fetch curriculum
export function useGetCurriculum(courseId: string) {
  return useQuery({
    queryKey: curriculumKeys.course(courseId),
    queryFn: async () => {
      const { data } = await axiosClient.get<Section[]>(`/api/admin/courses/${courseId}/sections`);
      return data;
    },
    enabled: !!courseId,
  });
}

// 2. Hook to create a section
export function useCreateSection(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = curriculumKeys.course(courseId);
  return useMutation({
    mutationFn: async (values: SectionInput) => {
      const { data } = await axiosClient.post<Section>(
        `/api/admin/courses/${courseId}/sections`,
        values
      );
      return data;
    },
    onSuccess: (data) => {
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Section[]>(queryKey, [...previous, { ...data, lectures: [] }]);
      }
    },
  });
}

// 3. Hook to update a section
export function useUpdateSection(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = curriculumKeys.course(courseId);
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: Partial<SectionInput>;
      skipInvalidate?: boolean;
    }) => {
      const { data } = await axiosClient.put<Section>(
        `/api/admin/courses/${courseId}/sections/${id}`,
        values
      );
      return data;
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCurriculum = queryClient.getQueryData<Section[]>(queryKey);

      if (previousCurriculum) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previousCurriculum.map((section) => {
            if (section.id === id) {
              return {
                ...section,
                ...values,
                description:
                  values.description === undefined
                    ? section.description
                    : values.description || null,
              };
            }
            return section;
          })
        );
      }

      return { previousCurriculum };
    },
    onError: (err, newVariables, context) => {
      if (context?.previousCurriculum) {
        queryClient.setQueryData(queryKey, context.previousCurriculum);
      }
    },
    onSuccess: (data) => {
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previous.map((s) => (s.id === data.id ? { ...s, ...data } : s))
        );
      }
    },
    onSettled: (data, error, variables) => {
      if (!variables?.skipInvalidate) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

// 4. Hook to delete a section
export function useDeleteSection(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = curriculumKeys.course(courseId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosClient.delete<{ success: boolean; deletedId: string }>(
        `/api/admin/courses/${courseId}/sections/${id}`
      );
      return data;
    },
    onSuccess: (data) => {
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previous.filter((s) => s.id !== data.deletedId)
        );
      }
    },
  });
}

// 5. Hook to create a lecture
export function useCreateLecture(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = curriculumKeys.course(courseId);
  return useMutation({
    mutationFn: async ({ sectionId, values }: { sectionId: string; values: LectureInput }) => {
      const { data } = await axiosClient.post<Lecture>(
        `/api/admin/courses/${courseId}/sections/${sectionId}/lectures`,
        values
      );
      return data;
    },
    onSuccess: (data, variables) => {
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previous.map((s) => {
            if (s.id === variables.sectionId) {
              return { ...s, lectures: [...s.lectures, data] };
            }
            return s;
          })
        );
      }
    },
  });
}

// 6. Hook to update a lecture
export function useUpdateLecture(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = curriculumKeys.course(courseId);
  return useMutation({
    mutationFn: async ({
      sectionId,
      id,
      values,
    }: {
      sectionId: string;
      id: string;
      values: Partial<LectureInput>;
      skipInvalidate?: boolean;
    }) => {
      const { data } = await axiosClient.put<Lecture>(
        `/api/admin/courses/${courseId}/sections/${sectionId}/lectures/${id}`,
        values
      );
      return data;
    },
    onMutate: async ({ sectionId, id, values }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCurriculum = queryClient.getQueryData<Section[]>(queryKey);

      if (previousCurriculum) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previousCurriculum.map((section) => {
            if (section.id === sectionId) {
              return {
                ...section,
                lectures: section.lectures.map((lecture) => {
                  if (lecture.id === id) {
                    return {
                      ...lecture,
                      ...values,
                      description:
                        values.description === undefined
                          ? lecture.description
                          : values.description || null,
                      videoUrl:
                        values.videoUrl === undefined ? lecture.videoUrl : values.videoUrl || null,
                      thumbnail:
                        values.thumbnail === undefined
                          ? lecture.thumbnail
                          : values.thumbnail || null,
                    };
                  }
                  return lecture;
                }),
              };
            }
            return section;
          })
        );
      }

      return { previousCurriculum };
    },
    onError: (err, newVariables, context) => {
      if (context?.previousCurriculum) {
        queryClient.setQueryData(queryKey, context.previousCurriculum);
      }
    },
    onSuccess: (data, variables) => {
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previous.map((s) => {
            if (s.id === variables.sectionId) {
              return {
                ...s,
                lectures: s.lectures.map((l) => (l.id === data.id ? data : l)),
              };
            }
            return s;
          })
        );
      }
    },
    onSettled: (data, error, variables) => {
      if (!variables?.skipInvalidate) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

// 7. Hook to delete a lecture
export function useDeleteLecture(courseId: string) {
  const queryClient = useQueryClient();
  const queryKey = curriculumKeys.course(courseId);
  return useMutation({
    mutationFn: async ({ sectionId, id }: { sectionId: string; id: string }) => {
      const { data } = await axiosClient.delete<{ success: boolean; deletedId: string }>(
        `/api/admin/courses/${courseId}/sections/${sectionId}/lectures/${id}`
      );
      return data;
    },
    onSuccess: (data, variables) => {
      const previous = queryClient.getQueryData<Section[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Section[]>(
          queryKey,
          previous.map((s) => {
            if (s.id === variables.sectionId) {
              return {
                ...s,
                lectures: s.lectures.filter((l) => l.id !== data.deletedId),
              };
            }
            return s;
          })
        );
      }
    },
  });
}

// 8. Hook to batch reorder sections
export function useReorderSections(courseId: string) {
  return useMutation({
    mutationFn: async (orders: { id: string; position: number }[]) => {
      const { data } = await axiosClient.put<{ success: boolean }>(
        `/api/admin/courses/${courseId}/sections/reorder`,
        { orders }
      );
      return data;
    },
  });
}

// 9. Hook to batch reorder lectures
export function useReorderLectures(courseId: string) {
  return useMutation({
    mutationFn: async ({
      sectionId,
      orders,
    }: {
      sectionId: string;
      orders: { id: string; position: number }[];
    }) => {
      const { data } = await axiosClient.put<{ success: boolean }>(
        `/api/admin/courses/${courseId}/sections/${sectionId}/lectures/reorder`,
        { orders }
      );
      return data;
    },
  });
}
