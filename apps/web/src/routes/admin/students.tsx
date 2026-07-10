import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  UserMinus,
  UserCheck,
  Search,
  Calendar,
  Phone,
  Globe,
  Info,
  AlertTriangle,
  Filter,
  ShieldX,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { Badge } from "@oedulms/ui/components/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@oedulms/ui/components/avatar";
import { Input } from "@oedulms/ui/components/input";
import { Card, CardContent } from "@oedulms/ui/components/card";
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
  TableHead,
  TableRow,
  TableCell,
} from "@oedulms/ui/components/table";

import { useStudents, useBanStudent, useUnbanStudent, type Student } from "@/api/students";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KpiCard } from "@/components/ui/kpi-card";
import { StudentDetailsSheet } from "@/features/student/student-details-sheet";

export const Route = createFileRoute("/admin/students")({
  component: AdminStudentsComponent,
});

function AdminStudentsComponent() {
  const { data: students = [], isLoading, isError, error } = useStudents();
  const banMutation = useBanStudent();
  const unbanMutation = useUnbanStudent();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "suspended">("all");

  // Selected Student for Detail Drawer
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

  // Ban / Unban dialog targets
  const [banTarget, setBanTarget] = React.useState<Student | null>(null);
  const [unbanTarget, setUnbanTarget] = React.useState<Student | null>(null);

  // Handler for ban submit
  const handleBanSubmit = async () => {
    if (!banTarget) return;
    try {
      await banMutation.mutateAsync({
        id: banTarget.id,
        reason: "Suspended by administrator",
      });
      toast.success(`${banTarget.name} has been suspended.`);
      setBanTarget(null);
    } catch {
      toast.error("Failed to suspend student.");
    }
  };

  // Handler for unban submit
  const handleUnbanSubmit = async () => {
    if (!unbanTarget) return;
    try {
      await unbanMutation.mutateAsync(unbanTarget.id);
      toast.success(`${unbanTarget.name} account is now active.`);
      setUnbanTarget(null);
    } catch {
      toast.error("Failed to reactivate student account.");
    }
  };

  // Compute KPIs
  const totalCount = students.length;
  const suspendedCount = students.filter((s) => !!s.banAt).length;
  const activeCount = totalCount - suspendedCount;

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "active") return matchesSearch && !student.banAt;
    if (statusFilter === "suspended") return matchesSearch && !!student.banAt;
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full h-full animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <CardContent className="p-6 h-24 bg-muted/40" />
            </Card>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-full sm:max-w-sm bg-muted/40 rounded-md" />
          <div className="h-10 w-40 bg-muted/40 rounded-md" />
        </div>
        <div className="flex-1 border rounded-lg bg-card mt-4 min-h-[300px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-3">
        <AlertTriangle className="size-5 text-destructive shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-destructive">Error Loading Students</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to retrieve students records."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full overflow-hidden">
      {/* 1. KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <KpiCard
          title="Total Students"
          value={totalCount}
          icon={Users}
          iconClassName="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Active"
          value={activeCount}
          icon={UserCheck}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
        />
        <KpiCard
          title="Suspended"
          value={suspendedCount}
          icon={UserMinus}
          iconClassName="bg-destructive/10 text-destructive"
        />
      </div>

      {/* 2. Filters / Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 w-full sm:max-w-sm relative">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-48 bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="suspended">Suspended Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Table list */}
      <div className="flex-1 border rounded-lg bg-card overflow-auto min-h-0">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <Users className="size-12 text-muted-foreground/35 mb-4" />
            <h3 className="text-base font-bold">No students found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Try adjusting your filters or search keywords.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="pl-6">Student</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="text-center">Enrollments</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="group">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        {student.image ? (
                          <AvatarImage src={student.image} alt={student.name} />
                        ) : null}
                        <AvatarFallback>{student.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground truncate">
                          {student.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    <div className="flex flex-col text-muted-foreground">
                      {student.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3" /> {student.phone}
                        </span>
                      )}
                      {student.country ? (
                        <span className="flex items-center gap-1.5 mt-0.5">
                          <Globe className="size-3" /> {student.country}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/50">
                          No country details
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {format(new Date(student.createdAt), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm font-semibold">
                    <Badge variant="outline" className="px-2 py-0.5 font-bold">
                      {student.enrollmentsCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {student.banAt ? (
                      <Badge variant="destructive" className="font-bold">
                        Suspended
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border-transparent"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                        title="View Profile Details"
                      >
                        <Info className="size-4" />
                      </Button>

                      {student.banAt ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => setUnbanTarget(student)}
                          title="Activate Account"
                        >
                          <UserCheck className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setBanTarget(student)}
                          title="Suspend Account"
                        >
                          <ShieldX className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 4. Student Detail Drawer (Sheet) */}
      <StudentDetailsSheet
        selectedStudent={selectedStudent}
        setSelectedStudent={setSelectedStudent}
      />

      {/* 5. Ban Confirm Dialog */}
      <ConfirmDialog
        open={!!banTarget}
        onOpenChange={(o) => !o && setBanTarget(null)}
        title="Suspend Student Account"
        desc={`Are you sure you want to suspend ${banTarget?.name}'s access? They will be immediately blocked from dashboard access.`}
        destructive
        confirmText="Suspend Account"
        handleConfirm={handleBanSubmit}
        isLoading={banMutation.isPending}
      />

      {/* 6. Unban Confirm Dialog */}
      <ConfirmDialog
        open={!!unbanTarget}
        onOpenChange={(o) => !o && setUnbanTarget(null)}
        title="Reactivate Account"
        desc={`Are you sure you want to lift the suspension for ${unbanTarget?.name}?`}
        confirmText="Reactivate"
        handleConfirm={handleUnbanSubmit}
        isLoading={unbanMutation.isPending}
      />
    </div>
  );
}
