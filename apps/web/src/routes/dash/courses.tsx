import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStudentEnrollments } from "@/api/enrollments";
import { usePublicCourses } from "@/api/courses";
import { CourseCard } from "@/components/course-card";
import { Card, CardContent } from "@oedulms/ui/components/card";
import { Button } from "@oedulms/ui/components/button";
import { BookOpen, Sparkles, GraduationCap } from "lucide-react";
import { Skeleton } from "@oedulms/ui/components/skeleton";

export const Route = createFileRoute("/dash/courses")({
  component: CoursesComponent,
});

function CoursesComponent() {
  const [activeTab, setActiveTab] = React.useState<"enrolled" | "catalog">("enrolled");

  const { data: enrollments, isLoading: isEnrollmentsLoading } = useStudentEnrollments();
  const { data: publicCourses, isLoading: isCatalogLoading } = usePublicCourses();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your enrolled courses or browse new ones to continue expanding your skills.
          </p>
        </div>

        {/* Custom Tab buttons */}
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 max-w-xs shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("enrolled")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "enrolled"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="size-4" />
            My Courses
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "catalog"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-4" />
            Explore Catalog
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "enrolled" ? (
        <div className="flex flex-col gap-6">
          {isEnrollmentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrollments.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="border border-border/40 hover:border-border/80 shadow-sm hover:shadow transition duration-200 overflow-hidden"
                >
                  <CardContent className="p-6 flex gap-5 items-center">
                    <div className="size-16 rounded-xl bg-primary/5 border border-border/30 overflow-hidden shrink-0 flex items-center justify-center">
                      {enrollment.course.thumbnail ? (
                        <img
                          src={enrollment.course.thumbnail}
                          alt={enrollment.course.title}
                          className="size-full object-cover"
                        />
                      ) : (
                        <BookOpen className="size-6 text-primary/75" />
                      )}
                    </div>

                    <div className="flex flex-col flex-grow min-w-0 gap-3">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-semibold text-base leading-snug truncate">
                          {enrollment.course.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {enrollment.course.shortDescription || "No description available"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-1">
                        <div className="flex flex-col gap-1 flex-grow max-w-[180px]">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Progress: {enrollment.progress}%
                          </span>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                        </div>

                        <Link to={"/courses/$slug"} params={{ slug: enrollment.course.slug }}>
                          <Button size="sm" className="h-8 text-xs font-semibold px-4">
                            {enrollment.progress === 0 ? "Start" : "Resume"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-muted/10 border-2 border-dashed rounded-2xl max-w-lg mx-auto mt-8">
              <BookOpen className="size-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-lg">No courses enrolled</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                You haven&apos;t enrolled in any courses yet. Browse our catalog and start learning
                today!
              </p>
              <Button size="sm" onClick={() => setActiveTab("catalog")}>
                Explore Courses
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {isCatalogLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
          ) : publicCourses && publicCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicCourses.map((course, idx) => (
                <CourseCard
                  key={course.id}
                  course={{
                    ...course,
                    // Provide safe defaults/mappings for any optional fields CourseCard needs
                    rating: 4.8,
                    reviews: 120,
                    students: "1,200",
                  }}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              No courses available in the catalog at this time.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
