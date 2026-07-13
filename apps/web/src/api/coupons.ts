import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";
import { couponsKeys } from "./query-keys";
import type { CouponInput } from "@oedulms/validator";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount?: number | null;
  minimumAmount?: number | null;
  startAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  courseIds: string[];
}

export type { CouponInput };

function normalizeCoupon(c: Coupon): Coupon {
  return {
    ...c,
    discountValue: c.discountType === "FIXED" ? c.discountValue / 100 : c.discountValue,
    maxDiscount: c.maxDiscount ? c.maxDiscount / 100 : null,
    minimumAmount: c.minimumAmount ? c.minimumAmount / 100 : null,
  };
}

async function fetchCoupons(): Promise<Coupon[]> {
  const { data } = await axiosClient.get<Coupon[]>("/admin/coupons");
  return data.map(normalizeCoupon);
}

async function fetchCouponById(id: string): Promise<Coupon> {
  const { data } = await axiosClient.get<Coupon>(`/admin/coupons/${id}`);
  return normalizeCoupon(data);
}

async function createCoupon(payload: CouponInput): Promise<Coupon> {
  const { data } = await axiosClient.post<Coupon>("/admin/coupons", payload);
  return normalizeCoupon(data);
}

async function updateCoupon({
  id,
  payload,
}: {
  id: string;
  payload: CouponInput;
}): Promise<Coupon> {
  const { data } = await axiosClient.put<Coupon>(`/admin/coupons/${id}`, payload);
  return normalizeCoupon(data);
}

async function deleteCoupon(id: string): Promise<void> {
  await axiosClient.delete(`/admin/coupons/${id}`);
}

export function useCoupons() {
  const query = useQuery({
    queryKey: couponsKeys.lists(),
    queryFn: fetchCoupons,
  });
  return {
    ...query,
    isEmpty: query.isSuccess && query.data.length === 0,
  };
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: couponsKeys.detail(id),
    queryFn: () => fetchCouponById(id),
    enabled: !!id,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKeys.lists() });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCoupon,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: couponsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: couponsKeys.lists() });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKeys.lists() });
    },
  });
}
