import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { axiosClient } from "@/lib/axios-client";
import { authClient } from "@/lib/auth-client";
import { useAuthStore } from "@/store/auth/auth-store";
import type { AuthUser } from "@/types/auth";
import type { LoginInput, RegisterInput, ForgotPasswordInput } from "@oedulms/validator/auth";

export interface AuthState {
  user: AuthUser | null;
  role: "STUDENT" | "TEACHER" | null;
}

export const authKeys = {
  me: ["auth", "me"] as const,
};

async function fetchMe(): Promise<AuthState> {
  try {
    const { data } = await axiosClient.get<AuthState>("/me");
    return data;
  } catch {
    return { user: null, role: null };
  }
}

export const authQueryOptions = queryOptions({
  queryKey: authKeys.me,
  queryFn: fetchMe,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

export const useMe = () => {
  return useQuery(authQueryOptions);
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const { error } = await authClient.signIn.email({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        const err = new Error(error.message || "Failed to sign in");
        (err as Error & { code?: string }).code = error.code;
        throw err;
      }

      // Fetch fresh /me state immediately to resolve the role
      const meResponse = await axiosClient.get<AuthState>("/me");
      return meResponse.data;
    },
    onSuccess: (data) => {
      // Set the cache directly with the resolved me data
      queryClient.setQueryData<AuthState>(authKeys.me, data);
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      useAuthStore.getState().setUser(data.user);
      useAuthStore.getState().setRole(data.role);
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (payload: RegisterInput) => {
      const { data, error } = await authClient.signUp.email({
        email: payload.email,
        password: payload.password,
        name: payload.name,
      });

      if (error) {
        throw new Error(error.message || "Failed to register");
      }
      return data;
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordInput) => {
      const { data, error } = await authClient.requestPasswordReset({
        email: payload.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw new Error(error.message || "Failed to request password reset");
      }
      return data;
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (payload: { password: string; token: string }) => {
      const { data, error } = await authClient.resetPassword({
        newPassword: payload.password,
        token: payload.token,
      });

      if (error) {
        throw new Error(error.message || "Failed to reset password");
      }
      return data;
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData<AuthState>(authKeys.me, { user: null, role: null });
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      useAuthStore.getState().clear();
    },
  });
};

export function useAuth() {
  const query = useMe();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setRole = useAuthStore((state) => state.setRole);

  useEffect(() => {
    if (query.isSuccess) {
      setUser(query.data.user);
      setRole(query.data.role);
    } else if (query.isError) {
      setUser(null);
      setRole(null);
    }
  }, [query.data, query.isSuccess, query.isError, setUser, setRole]);

  return {
    user: query.data?.user ?? null,
    role: query.data?.role ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    refresh: async () => {
      await queryClient.refetchQueries({ queryKey: authKeys.me });
    },
  };
}
