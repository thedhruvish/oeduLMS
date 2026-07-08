import { create } from "zustand";
import { AuthUser } from "@/types/auth";

export interface AuthState {
  user: AuthUser | null;
  role: "STUDENT" | "TEACHER" | null;
  setUser: (user: AuthUser | null) => void;
  setRole: (role: "STUDENT" | "TEACHER" | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clear: () => set({ user: null, role: null }),
}));
