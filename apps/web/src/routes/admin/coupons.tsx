import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Tag,
  Percent,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@oedulms/ui/components/button";
import { Badge } from "@oedulms/ui/components/badge";
import { Input } from "@oedulms/ui/components/input";
import { Card, CardContent } from "@oedulms/ui/components/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@oedulms/ui/components/table";

import { useCoupons, useDeleteCoupon, type Coupon } from "@/api/coupons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CouponFormSheet } from "@/features/coupons/coupon-form-sheet";
import { KpiCard } from "@/components/ui/kpi-card";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCouponsComponent,
});

function AdminCouponsComponent() {
  const { data: coupons = [], isLoading, isError, error } = useCoupons();
  const deleteMutation = useDeleteCoupon();

  // Selected for edit/creation Drawer
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingCoupon, setEditingCoupon] = React.useState<Coupon | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = React.useState("");

  // Delete State
  const [deleteTarget, setDeleteTarget] = React.useState<Coupon | null>(null);

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`Coupon ${deleteTarget.code} deleted successfully.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete coupon.");
    }
  };

  // Compute KPIs
  const totalCount = coupons.length;
  const activeCount = coupons.filter((c) => c.isActive).length;
  const expiredCount = coupons.filter(
    (c) => c.expiresAt && new Date(c.expiresAt) < new Date()
  ).length;

  // Filter
  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full h-full animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <CardContent className="p-6 h-24 bg-muted/40" />
            </Card>
          ))}
        </div>
        <div className="h-10 w-full sm:max-w-sm bg-muted/40 rounded-md shrink-0" />
        <div className="flex-1 border rounded-lg bg-card mt-4 min-h-[300px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-3">
        <AlertTriangle className="size-5 text-destructive shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-destructive">Error Loading Coupons</h3>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to retrieve coupons list."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full overflow-hidden">
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <KpiCard
          title="Total Coupons"
          value={totalCount}
          icon={Tag}
          iconClassName="bg-primary/10 text-primary"
        />
        <KpiCard
          title="Active"
          value={activeCount}
          icon={Tag}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          title="Expired"
          value={expiredCount}
          icon={Calendar}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* 2. Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 w-full sm:max-w-sm relative">
          <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Button
          onClick={() => {
            setEditingCoupon(null);
            setIsDrawerOpen(true);
          }}
          size="sm"
        >
          <Plus className="size-4" data-icon="inline-start" />
          New Coupon
        </Button>
      </div>

      {/* 3. Table */}
      <div className="flex-1 border rounded-lg bg-card overflow-auto min-h-0 relative">
        {filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <Tag className="size-12 text-muted-foreground/35 mb-4" />
            <h3 className="text-base font-bold">No coupons found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Create a new coupon code to get started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="pl-6">Code & Details</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="hidden md:table-cell">Applies To</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead className="hidden sm:table-cell">Validity</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                return (
                  <TableRow key={coupon.id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-foreground text-sm tracking-wide bg-muted px-1.5 py-0.5 rounded w-fit">
                          {coupon.code}
                        </span>
                        <span className="font-semibold text-xs text-muted-foreground truncate max-w-xs mt-1">
                          {coupon.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-sm">
                        {coupon.discountType === "PERCENTAGE" ? (
                          <span className="flex items-center gap-1">
                            <Percent className="size-3.5" /> {coupon.discountValue}%
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="size-3.5" /> {coupon.discountValue.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {coupon.courseIds.length === 0 ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                        >
                          All Courses
                        </Badge>
                      ) : (
                        <span>
                          {coupon.courseIds.length} restricted{" "}
                          {coupon.courseIds.length === 1 ? "course" : "courses"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      <span>
                        {coupon.usedCount} / {coupon.usageLimit ?? "∞"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {coupon.startAt && (
                          <span>Starts: {format(new Date(coupon.startAt), "MMM d, yyyy")}</span>
                        )}
                        {coupon.expiresAt ? (
                          <span className={isExpired ? "text-destructive font-semibold" : ""}>
                            Expires: {format(new Date(coupon.expiresAt), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">Never expires</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {coupon.isActive && !isExpired ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border-transparent"
                        >
                          Active
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive" className="font-bold">
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-bold">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setIsDrawerOpen(true);
                          }}
                          title="Edit Coupon"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(coupon)}
                          title="Delete Coupon"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 4. Create / Edit Coupon Drawer */}
      <CouponFormSheet
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        editingCoupon={editingCoupon}
      />

      {/* 5. Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Coupon Code"
        desc={`Are you sure you want to permanently delete coupon '${deleteTarget?.code}'? This will delete all course restriction relations.`}
        destructive
        confirmText="Delete"
        handleConfirm={handleDeleteSubmit}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
