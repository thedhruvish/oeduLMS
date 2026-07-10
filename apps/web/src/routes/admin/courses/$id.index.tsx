import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Edit,
  AlertCircle,
  BookOpen,
  Clock,
  Globe,
  BarChart2,
  Video,
  Award,
  List,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { Badge } from "@oedulms/ui/components/badge";
import { useCourse, useDeleteCourse } from "@/api/courses";
import { useConfirm } from "@/store/confirm-store";

export const Route = createFileRoute("/admin/courses/$id/")({
  component: AdminCourseDetailComponent,
});

function AdminCourseDetailComponent() {
  const { id } = Route.useParams();
  const { data: course, isLoading, isError, error } = useCourse(id);
  const deleteCourseMutation = useDeleteCourse();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!course) return;
    const ok = await confirm({
      title: "Delete Course?",
      desc: `Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`,
      destructive: true,
      confirmText: "Delete",
    });

    if (ok) {
      try {
        await deleteCourseMutation.mutateAsync(course.id);
        toast.success("Course deleted successfully!");
        navigate({ to: "/admin/courses" });
      } catch {
        toast.error("Failed to delete course.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="flex gap-4 items-center">
          <div className="size-8 bg-muted rounded" />
          <div className="h-6 w-48 bg-muted rounded" />
        </div>
        <div className="h-64 bg-card border rounded-lg" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="p-6 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-3">
        <AlertCircle className="size-5 text-destructive shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-destructive">Course Not Found</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "The requested course could not be located."}
          </p>
          <Button
            render={<Link to="/admin/courses" />}
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
          >
            Back to Catalog
          </Button>
        </div>
      </div>
    );
  }

  const formatPrice = (p: number) => {
    if (p === 0) return "Free";
    const symbol = course.currency === "INR" ? "₹" : course.currency === "EUR" ? "€" : "$";
    return `${symbol}${p.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center flex-wrap gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            render={<Link to="/admin/courses" />}
            size="icon"
            variant="ghost"
            className="size-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-xl font-bold truncate max-w-lg">{course.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            render={<Link to="/admin/courses/$id/curriculum" params={{ id: course.id }} />}
            variant="outline"
            size="sm"
          >
            <BookOpen className="size-4" data-icon="inline-start" />
            Manage Curriculum
          </Button>
          <Button
            render={<Link to="/admin/courses/$id/edit" params={{ id: course.id }} />}
            size="sm"
            variant="outline"
          >
            <Edit className="size-4" data-icon="inline-start" />
            Edit Details
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteCourseMutation.isPending}
          >
            <Trash2 className="size-4" data-icon="inline-start" />
            Delete Course
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Panel */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="p-6 border rounded-lg bg-card flex flex-col gap-5">
            {course.thumbnail && (
              <div className="aspect-video w-full rounded-lg overflow-hidden border bg-muted/40 relative">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Short Description
              </span>
              <p className="text-sm text-foreground mt-1">
                {course.shortDescription || "No short description provided."}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Full Description
              </span>
              <p className="text-sm text-foreground whitespace-pre-wrap mt-1">
                {course.description || "No full description provided."}
              </p>
            </div>

            {course.trailerVideo && (
              <div className="border-t pt-4">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">
                  Trailer Video
                </span>
                <a
                  href={course.trailerVideo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Video className="size-3.5" />
                  View Trailer Video <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="flex flex-col gap-6">
          <div className="p-6 border rounded-lg bg-card flex flex-col gap-4">
            <h3 className="font-bold border-b pb-2">Information</h3>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="size-4" />
                Status:
              </span>
              <Badge variant={course.status === "PUBLISHED" ? "default" : "secondary"}>
                {course.status}
              </Badge>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <BarChart2 className="size-4" />
                Difficulty:
              </span>
              <span className="font-medium capitalize">{course.level.toLowerCase()}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Globe className="size-4" />
                Language:
              </span>
              <span className="font-medium">{course.language || "English"}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-4" />
                Access:
              </span>
              <span className="font-medium">
                {course.validateDays ? `${course.validateDays} Days` : "Lifetime"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <List className="size-4" />
                Lectures count:
              </span>
              <span className="font-medium">{course.totalLectures} lectures</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Award className="size-4" />
                Certificate:
              </span>
              <span className="font-medium">
                {course.certificateEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="border-t pt-4 flex flex-col gap-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground">Base Price:</span>
                <span
                  className={`text-base font-bold ${course.discountPrice ? "line-through text-muted-foreground text-xs" : "text-foreground"}`}
                >
                  {formatPrice(course.price)}
                </span>
              </div>
              {course.discountPrice && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Discount Price:</span>
                  <span className="text-lg font-black text-primary">
                    {formatPrice(course.discountPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
