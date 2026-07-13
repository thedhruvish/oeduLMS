import { useParams, Link } from "@tanstack/react-router";
import { BookOpen, ArrowLeft, ExternalLink } from "lucide-react";
import { usePublicCourseDetails } from "@/api/courses";
import { CheckoutSidebar } from "./components/checkout-sidebar";
import { siteConfig } from "@/config/site";
import { getThumbClass } from "@/config/utils";

function FastCheckoutSkeleton() {
  return (
    <div className="min-h-screen pt-12 pb-20 bg-background animate-pulse">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-7 space-y-6">
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="aspect-video bg-muted rounded-2xl w-full" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
          <div className="md:col-span-5 h-[450px] bg-muted rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function FastCheckoutPage() {
  const { slug } = useParams({ from: "/fast-checkout/$slug" });
  const { data: course, isLoading, isError } = usePublicCourseDetails(slug);

  if (isLoading) {
    return <FastCheckoutSkeleton />;
  }

  if (isError || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
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
    <div className="min-h-screen pt-12 pb-20 bg-background flex flex-col">
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to={"/courses"}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Courses
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Course Summary */}
          <div className="md:col-span-7 space-y-6">
            {/* Logo / Site Title rendered directly in leftside content */}
            <div>
              <Link
                to={"/"}
                className="text-xl font-black tracking-tight text-foreground hover:opacity-90 transition-opacity"
              >
                {siteConfig.nav.logo}
              </Link>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-[10px] font-bold px-2 py-0.5 tracking-wide uppercase">
                Fast Checkout
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                {course.title}
              </h1>
            </div>

            {/* Thumbnail */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-border/60 shadow-md max-w-md w-full">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${getThumbClass(course.id)} flex items-center justify-center`}
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[size:20px_20px]" />
                  <BookOpen className="size-16 text-white/20" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Instructor
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {course.instructorName}
                </span>
              </div>

              {course.shortDescription && (
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Short Description
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {course.shortDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Highlighted Full Details Link */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] flex items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Want to see the curriculum, syllabus, and FAQs first?
              </div>
              <Link
                to={"/courses/$slug"}
                params={{ slug: course.slug }}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-bold px-4 py-2 shrink-0 transition"
              >
                Full Details
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Checkout Sidebar Widget */}
          <div className="md:col-span-5">
            <CheckoutSidebar
              courseId={course.id}
              courseTitle={course.title}
              coursePrice={course.price}
              discountPrice={course.discountPrice}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
