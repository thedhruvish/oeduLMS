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
