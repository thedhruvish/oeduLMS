import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useInView } from "motion/react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { CourseCard } from "@/components/course-card";
import { usePublicCourses } from "@/api/courses";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
} as const;

export function CoursesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { data: courses = [], isLoading, isError } = usePublicCourses();

  // Limit home page to top 3 courses
  const displayedCourses = courses.slice(0, 3);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground mb-4">
              <BookOpen className="size-3.5" />
              Popular Courses
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Start with the Best
            </h2>
          </div>
          <Link to="/courses">
            <Button variant="outline" className="gap-2 shrink-0">
              View All Courses
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
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

        {/* Error or Empty state */}
        {!isLoading && (isError || courses.length === 0) && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border p-8">
            <BookOpen className="size-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No Courses Published Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              Check back soon for new and exciting programming courses from our instructors.
            </p>
          </div>
        )}

        {/* Course cards grid */}
        {!isLoading && courses.length > 0 && (
          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {displayedCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
