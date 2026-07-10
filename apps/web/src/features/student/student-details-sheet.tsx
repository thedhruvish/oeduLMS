import { Student } from "@/api/students";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@oedulms/ui/components/sheet";
import { Separator } from "@oedulms/ui/components/separator";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@oedulms/ui/components/avatar";
import { ShieldAlert, Mail, Phone, Globe } from "lucide-react";
import { Badge } from "@oedulms/ui/components/badge";

interface StudentDetailsSheetProps {
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student | null) => void;
}

export function StudentDetailsSheet({
  selectedStudent,
  setSelectedStudent,
}: StudentDetailsSheetProps) {
  return (
    <Sheet open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Student Profile</SheetTitle>
          <SheetDescription>Detailed metadata for registered student.</SheetDescription>
        </SheetHeader>

        {selectedStudent && (
          <div className="flex flex-col gap-6 px-4 pb-6">
            {/* Avatar + Name */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <Avatar size="lg" className="size-16">
                {selectedStudent.image ? (
                  <AvatarImage src={selectedStudent.image} alt={selectedStudent.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {selectedStudent.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h4 className="text-sm font-bold">{selectedStudent.name}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center mt-0.5">
                  <Mail className="size-3" />
                  {selectedStudent.email}
                </p>
              </div>
              {selectedStudent.banAt ? (
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
            </div>

            <Separator />

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Joined
                </span>
                <span className="text-xs font-semibold mt-1 block">
                  {format(new Date(selectedStudent.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Enrollments
                </span>
                <span className="text-xs font-semibold mt-1 block">
                  {selectedStudent.enrollmentsCount} courses
                </span>
              </div>
            </div>

            {/* Suspension banner */}
            {selectedStudent.banAt && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
                <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-destructive">Account Suspended</span>
                  <span className="text-[10px] text-muted-foreground">
                    Suspended on {format(new Date(selectedStudent.banAt), "MMM d, yyyy HH:mm")}.
                  </span>
                  {selectedStudent.banReason && (
                    <p className="text-[10px] text-foreground bg-destructive/5 p-2 rounded border mt-1 italic">
                      &ldquo;{selectedStudent.banReason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Contact & Country */}
            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-bold text-muted-foreground">Contact & Country</h5>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center py-1 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5" /> Phone
                  </span>
                  <span className="font-semibold">
                    {selectedStudent.phone || (
                      <span className="text-muted-foreground/40 italic">Not set</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5" /> Country
                  </span>
                  <span className="font-semibold">
                    {selectedStudent.country || (
                      <span className="text-muted-foreground/40 italic">Not set</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Bio */}
            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-bold text-muted-foreground">Bio</h5>
              <div className="p-3 bg-muted/30 rounded border text-xs text-foreground leading-relaxed">
                {selectedStudent.bio || (
                  <span className="text-muted-foreground/40 italic">
                    No biographical info provided.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
