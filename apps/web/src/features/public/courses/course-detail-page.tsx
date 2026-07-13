import { useParams } from "@tanstack/react-router";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { usePublicCourseDetails } from "@/api/courses";
import { CourseHero } from "./components/course-hero";
import { CourseCurriculum } from "./components/course-curriculum";
import { CourseFaqs } from "./components/course-faqs";
import { CheckoutSidebar } from "./components/checkout-sidebar";
import { SafeHtmlRenderer } from "@/components/safe-html-renderer";

function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen pb-20 bg-background animate-pulse">
      {/* Hero Skeleton */}
      <div className="border-b border-border/60 bg-muted/20 dark:bg-muted/5 pt-28 pb-12 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-10 bg-muted rounded w-3/4 sm:w-2/3" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="flex gap-4 pt-2">
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
            </div>
            <div className="aspect-video bg-muted rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Side */}
          <div className="lg:col-span-2 space-y-12">
            {/* Description */}
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>

            {/* Curriculum */}
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-12 bg-muted rounded-xl w-full" />
              <div className="h-12 bg-muted rounded-xl w-full" />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="h-[400px] bg-muted rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function CourseDetailPage() {
  const { slug } = useParams({ from: "/_public/courses/$slug" });
  const { data: course, isLoading, isError } = usePublicCourseDetails(slug);

  if (isLoading) {
    return <CourseDetailSkeleton />;
  }

  if (isError || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4 bg-background">
        <div className="text-center max-w-sm">
          <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Course Not Found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            We couldn&apos;t retrieve details for this course. It may have been unpublished or
            removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Course Hero header section */}
      <CourseHero course={course} />

      {/* Main Details grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Content Details */}
          <div className="lg:col-span-2 space-y-12">
            {/* Description */}
            <section>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-4">
                Course Description
              </h2>
              {course.description ? (
                <SafeHtmlRenderer html={course.description} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description provided for this course.
                </p>
              )}
            </section>

            {/* Curriculum (circular) */}
            <CourseCurriculum courseIdOrSlug={course.id} />

            {/* Instructions */}
            <section>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-4">
                Learning Instructions
              </h2>
              <ul className="space-y-3">
                {[
                  "Self-paced learning structure: complete lectures at your own comfortable pace.",
                  "Hands-on coding files and projects are provided within each lecture segment.",
                  "Ask questions directly in our community board if you encounter setup issues.",
                  "Earn your digital certificate of completion immediately after checking off all sections.",
                ].map((inst, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-sm text-muted-foreground leading-relaxed"
                  >
                    <CheckCircle2 className="size-5 shrink-0 text-foreground/45 mt-0.5" />
                    <span>{inst}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* FAQs */}
            <CourseFaqs courseIdOrSlug={course.id} />
          </div>

          {/* Right: Checkout Sidebar Widget */}
          <div className="space-y-6">
            <CheckoutSidebar
              courseId={course.id}
              courseTitle={course.title}
              coursePrice={course.price}
              discountPrice={course.discountPrice}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
