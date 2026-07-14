export const coursesKeys = {
  all: ["courses"] as const,
  lists: () => [...coursesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...coursesKeys.lists(), filters] as const,
  details: () => [...coursesKeys.all, "detail"] as const,
  detail: (id: string) => [...coursesKeys.details(), id] as const,
};
export const curriculumKeys = {
  all: ["curriculum"] as const,
  course: (courseId: string) => [...curriculumKeys.all, "course", courseId] as const,
};

export const studentsKeys = {
  all: ["students"] as const,
  lists: () => [...studentsKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...studentsKeys.lists(), filters] as const,
  details: () => [...studentsKeys.all, "detail"] as const,
  detail: (id: string) => [...studentsKeys.details(), id] as const,
};

export const couponsKeys = {
  all: ["coupons"] as const,
  lists: () => [...couponsKeys.all, "list"] as const,
  details: () => [...couponsKeys.all, "detail"] as const,
  detail: (id: string) => [...couponsKeys.details(), id] as const,
};

export const enrollmentsKeys = {
  all: ["enrollments"] as const,
  lists: () => [...enrollmentsKeys.all, "list"] as const,
};

export const coursePlayerKeys = {
  all: ["course-player"] as const,
  course: (courseId: string) => [...coursePlayerKeys.all, "course", courseId] as const,
  comments: (courseId: string, lectureId: string) =>
    [...coursePlayerKeys.all, "comments", courseId, lectureId] as const,
  questions: (courseId: string, lectureId: string) =>
    [...coursePlayerKeys.all, "questions", courseId, lectureId] as const,
};
