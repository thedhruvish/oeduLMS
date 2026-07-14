import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/api/auth";
import { useStudentEnrollments } from "@/api/enrollments";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@oedulms/ui/components/card";
import { Button } from "@oedulms/ui/components/button";
import { BookOpen, Award, ArrowRight, MessageSquare, UserCheck } from "lucide-react";

export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const { data: enrollments, isLoading } = useStudentEnrollments();

  // Compute stats
  const totalCourses = enrollments?.length || 0;
  const completedCourses = enrollments?.filter((e) => e.progress === 100).length || 0;
  const avgProgress =
    totalCourses > 0
      ? Math.round(enrollments!.reduce((sum, e) => sum + e.progress, 0) / totalCourses)
      : 0;

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      {/* Premium Hero Greeting banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-primary-hover p-6 md:p-10 text-primary-foreground shadow-lg shadow-primary/20">
        <div className="relative z-10 flex flex-col gap-2 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
            Student Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/90 mt-1">
            Welcome back to your learning space. You have completed {completedCourses} of your{" "}
            {totalCourses} courses. Keep pushing!
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/dash/courses">
              <Button size="sm" variant="secondary" className="font-semibold shadow-sm">
                Resume Learning
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
        {/* Subtle background graphics */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 hidden md:block pointer-events-none">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M0,100 C30,40 70,60 100,0 L100,100 Z" />
          </svg>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border border-border/50 shadow-sm hover:shadow-md transition">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <BookOpen className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Courses Enrolled</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : totalCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm hover:shadow-md transition">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-600">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Courses Completed</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : completedCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm hover:shadow-md transition">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <span className="text-lg font-bold">%</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Average Progress</p>
              <h3 className="text-2xl font-bold">{isLoading ? "..." : `${avgProgress}%`}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enrolled Courses Section */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight">Recent Courses</h2>
            <Link
              to="/dash/courses"
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 w-full bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="flex flex-col gap-4">
              {enrollments.slice(0, 3).map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="border border-border/40 hover:border-border/80 shadow-none hover:shadow-sm transition duration-200 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="size-12 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-border/30 overflow-hidden">
                        {enrollment.course.thumbnail ? (
                          <img
                            src={enrollment.course.thumbnail}
                            alt={enrollment.course.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <BookOpen className="size-5 text-primary/75" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-semibold text-sm sm:text-base leading-snug line-clamp-1">
                          {enrollment.course.title}
                        </h4>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {enrollment.course.shortDescription || "No description available"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto shrink-0">
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {enrollment.progress}% complete
                        </span>
                        <Link to={`/dash/courses`}>
                          <Button size="xs" variant="outline" className="h-7 text-xs font-medium">
                            Resume
                          </Button>
                        </Link>
                      </div>
                      <div className="w-full sm:w-32 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 py-10 flex flex-col items-center justify-center text-center p-6 bg-muted/10">
              <BookOpen className="size-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No enrolled courses</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                You haven&apos;t enrolled in any courses yet. Browse our catalog to kickstart your
                journey.
              </p>
              <Link to="/dash/courses">
                <Button size="sm">Explore Catalog</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Sidebar Help / Quick Action widgets */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
          <div className="flex flex-col gap-4">
            <Card className="border border-border/50 shadow-sm hover:shadow-md transition">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary">
                  <MessageSquare className="size-4" />
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Social Feed
                  </CardTitle>
                </div>
                <CardDescription className="text-xs pt-1">
                  Connect with your fellow students and instructors.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/dash/feed">
                  <Button
                    size="sm"
                    variant="link"
                    className="p-0 text-xs font-semibold h-auto text-primary"
                  >
                    Jump to Social Feed →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-sm hover:shadow-md transition">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-green-600">
                  <UserCheck className="size-4" />
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Profile Setup
                  </CardTitle>
                </div>
                <CardDescription className="text-xs pt-1">
                  Keep your bio, phone, and profile info up-to-date.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to="/dash/profile">
                  <Button
                    size="sm"
                    variant="link"
                    className="p-0 text-xs font-semibold h-auto text-green-600"
                  >
                    Update Profile →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
