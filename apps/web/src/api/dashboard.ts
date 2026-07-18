import { useQuery } from "@tanstack/react-query";
import { axiosClient } from "@/lib/axios-client";

export interface DashboardStats {
  activeCourses: number;
  totalStudents: number;
  totalEarnings: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await axiosClient.get<DashboardStats>("/admin/dashboard/stats");
  return data;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: fetchDashboardStats,
  });
}
