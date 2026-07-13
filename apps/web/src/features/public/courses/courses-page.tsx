import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Search } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { usePublicCourses } from "@/api/courses";

export function CoursesPage() {
  const [query, setQuery] = useState("");
  const { data: allCourses = [], isLoading, isError } = usePublicCourses();

  // Filter courses based only on the search query
  const filtered = useMemo(() => {
    return allCourses.filter((c) => {
      const matchQuery =
        query === "" ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        (c.instructorName && c.instructorName.toLowerCase().includes(query.toLowerCase())) ||
        (c.shortDescription && c.shortDescription.toLowerCase().includes(query.toLowerCase()));
      return matchQuery;
    });
  }, [allCourses, query]);

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Search & Hero Section (Explore Our Courses title removed) */}
      <section className="relative overflow-hidden border-b border-border/60 py-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground mb-5">
              <BookOpen className="size-3.5" />
              {isLoading ? "Loading Courses..." : `${allCourses.length} Courses Available`}
            </span>

            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              From beginner foundations to advanced system design — find the course that takes your
              skills to the next level.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses, instructors or topics…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Result count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground mb-6">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "course" : "courses"}
              {query && ` matching "${query}"`}
            </p>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-border/60 bg-card h-[380px] animate-pulse flex flex-col overflow-hidden"
                >
                  <div className="h-44 bg-muted w-full" />
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-10 bg-muted rounded w-full mt-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && isError && (
            <div className="py-24 text-center">
              <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-1">Failed to Load Courses</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                There was a problem communicating with the backend. Please try reloading or check
                back later.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center"
            >
              <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">No courses found matching your search.</p>
              <button
                className="mt-4 text-xs font-semibold text-foreground underline decoration-dotted"
                onClick={() => setQuery("")}
              >
                Clear search query
              </button>
            </motion.div>
          )}

          {/* Grid */}
          {!isLoading && !isError && filtered.length > 0 && (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((course, i) => (
                  <CourseCard key={course.id} course={course} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
