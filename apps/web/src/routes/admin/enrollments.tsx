import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap,
  Search,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Plus,
  Undo,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { Badge } from "@oedulms/ui/components/badge";
import { Input } from "@oedulms/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@oedulms/ui/components/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@oedulms/ui/components/table";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";

import {
  useEnrollments,
  useDeleteEnrollment,
  useUpdateEnrollment,
  useRefundEnrollment,
  type Enrollment,
} from "@/api/enrollments";
import { useCourses } from "@/api/courses";
import { cn } from "@oedulms/ui/lib/utils";
import { AxiosError } from "axios";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KpiCard } from "@/components/ui/kpi-card";
import { QueryBoundary } from "@/components/ui/query-boundary";
import { EnrollmentFormSheet } from "@/features/enrollments/enrollment-form-sheet";

export const Route = createFileRoute("/admin/enrollments")({
  component: AdminEnrollmentsComponent,
});

function AdminEnrollmentsComponent() {
  const { data: enrollments = [], isLoading, isError, error } = useEnrollments();
  const { data: coursesData = [] } = useCourses();
  const deleteMutation = useDeleteEnrollment();
  const updateMutation = useUpdateEnrollment();
  const refundMutation = useRefundEnrollment();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [courseFilter, setCourseFilter] = React.useState<string>("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Enrollment | null>(null);
  const [refundTarget, setRefundTarget] = React.useState<Enrollment | null>(null);
  const [refundType, setRefundType] = React.useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = React.useState<string>("");

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Enrollment deleted successfully.");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete enrollment.");
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundTarget) return;
    try {
      const amount = refundType === "partial" ? parseFloat(refundAmount) : undefined;
      if (refundType === "partial" && (isNaN(amount!) || amount! <= 0)) {
        toast.error("Please enter a valid refund amount.");
        return;
      }
      if (refundType === "partial" && refundTarget.payment) {
        const paidAmount = refundTarget.payment.amount / 100;
        if (amount! > paidAmount) {
          toast.error(
            `Refund amount cannot exceed the total amount paid (₹${paidAmount.toLocaleString()}).`
          );
          return;
        }
      }
      await refundMutation.mutateAsync({
        id: refundTarget.id,
        amount,
      });
      toast.success("Payment refunded successfully.");
      setRefundTarget(null);
      setRefundAmount("");
      setRefundType("full");
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      const msg = axiosErr.response?.data?.error || "Failed to process refund.";
      toast.error(msg);
    }
  };

  const handleStatusChange = async (
    enrollment: Enrollment,
    newStatus: "active" | "completed" | "refunded"
  ) => {
    try {
      await updateMutation.mutateAsync({
        id: enrollment.id,
        payload: { status: newStatus },
      });
      toast.success(`Enrollment status updated to ${newStatus}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // KPI aggregates
  const totalCount = enrollments.length;
  const activeCount = enrollments.filter((e) => e.status === "active").length;
  const completedCount = enrollments.filter((e) => e.status === "completed").length;

  // Filtered List
  const filtered = enrollments.filter((e) => {
    const matchesSearch =
      e.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.course.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter.toLowerCase();
    const matchesCourse = courseFilter === "ALL" || e.course.id === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  return (
    <div className="flex flex-col gap-6 w-full h-full overflow-hidden">
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <KpiCard
          title="Total Enrollments"
          value={totalCount}
          icon={GraduationCap}
          iconClassName="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Active Students"
          value={activeCount}
          icon={ShieldCheck}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
        />
        <KpiCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-500"
        />
      </div>

      {/* 2. Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 w-full sm:max-w-sm relative">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by student or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <Select value={courseFilter} onValueChange={(val) => setCourseFilter(val || "ALL")}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card">
              <SelectValue placeholder="Filter by Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Courses</SelectItem>
              {coursesData.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-full sm:w-[150px] bg-card">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto shrink-0">
            <Plus className="size-4" data-icon="inline-start" />
            Enroll Student
          </Button>
        </div>
      </div>

      {/* 3. Table/Query Boundary */}
      <div className="flex-1 min-h-0 relative">
        <QueryBoundary
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={filtered.length === 0}
          emptyTitle={
            searchTerm || statusFilter !== "ALL" ? "No matches found" : "No enrollments yet"
          }
          emptyDesc={
            searchTerm || statusFilter !== "ALL"
              ? "Try adjusting your search terms or filters."
              : "Click the button above to manually enroll a student."
          }
          emptyIcon={GraduationCap}
        >
          <div className="flex-1 border rounded-lg bg-card overflow-auto min-h-0 h-full">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Amount Paid</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Enrolled On</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="group transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs uppercase bg-muted font-bold">
                            {item.student.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm truncate text-foreground">
                            {item.student.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.student.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-[200px] truncate font-medium text-foreground">
                      {item.course.title}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col items-center justify-center gap-1.5 w-28 mx-auto">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {item.progress}% Complete
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-medium text-foreground">
                      {item.payment ? `₹${(item.payment.amount / 100).toLocaleString()}` : "—"}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.status === "completed"
                            ? "default"
                            : item.status === "refunded"
                              ? "destructive"
                              : "secondary"
                        }
                        className={
                          item.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : item.status === "refunded"
                              ? "bg-destructive/15 text-destructive border-destructive/20"
                              : "bg-primary/10 text-primary border-primary/20"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {format(new Date(item.createdAt), "MMM dd, yyyy")}
                    </TableCell>

                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === "active" && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleStatusChange(item, "completed")}
                            title="Mark as Complete"
                            className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                          >
                            <CheckCircle2 className="size-3.5" />
                          </Button>
                        )}
                        {item.status === "completed" && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleStatusChange(item, "active")}
                            title="Re-activate Enrollment"
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                        {item.status !== "refunded" && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => setRefundTarget(item)}
                            title="Refund Payment"
                            className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                          >
                            <Undo className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setDeleteTarget(item)}
                          title="Delete Enrollment"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </QueryBoundary>
      </div>

      {/* Manual Enrollment Form Drawer */}
      <EnrollmentFormSheet open={formOpen} onOpenChange={setFormOpen} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Revoke Course Enrollment"
        desc={`Are you sure you want to permanently revoke student '${deleteTarget?.student.name}' access to course '${deleteTarget?.course.title}'? This will delete all progressive records.`}
        destructive
        confirmText="Revoke Access"
        handleConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      {/* Refund Confirmation Dialog */}
      <ConfirmDialog
        open={!!refundTarget}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="Refund Enrollment Payment"
        desc={
          <div className="space-y-1 text-start">
            <p>
              Select the refund type for student{" "}
              <strong className="text-foreground">{refundTarget?.student.name}</strong> enrolled in{" "}
              <strong className="text-foreground">{refundTarget?.course.title}</strong>.
            </p>
            {refundTarget?.payment ? (
              <p className="text-xs text-muted-foreground mt-2">
                Total amount paid:{" "}
                <strong className="text-foreground font-semibold">
                  ₹{(refundTarget.payment.amount / 100).toLocaleString()}
                </strong>
              </p>
            ) : (
              <p className="text-xs text-amber-600 font-medium mt-2">
                No online payment associated with this enrollment.
              </p>
            )}
          </div>
        }
        confirmText="Confirm Refund"
        destructive
        handleConfirm={handleRefundSubmit}
        isLoading={refundMutation.isPending}
      >
        <div className="space-y-4 my-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setRefundType("full")}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg border text-sm font-semibold transition-all",
                refundType === "full"
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              Full Refund
            </button>
            <button
              type="button"
              onClick={() => setRefundType("partial")}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg border text-sm font-semibold transition-all",
                refundType === "partial"
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              Partial Refund
            </button>
          </div>

          {refundType === "partial" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Refund Amount (₹)
              </label>
              <Input
                type="number"
                placeholder="Enter custom amount to refund..."
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min="1"
                className="bg-card w-full"
              />
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
