import { trpc } from "@/lib/trpc";
import { useCallback, useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const utils = trpc.useUtils();
  const query = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false, staleTime: 60_000 });
  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      utils.auth.me.setData(undefined, null);
      window.location.href = "/access";
    }
  }, [logoutMutation, utils]);

  return {
    user: query.data ?? null,
    loading: query.isLoading,
    isAuthenticated: Boolean(query.data),
    refresh: () => query.refetch(),
    logout,
  };
}

/** Redirige vers la page de connexion si l'utilisateur n'est pas connecté (sans effet de bord pendant le rendu). */
export function useRequireAuth(options?: { admin?: boolean }) {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const blocked = !auth.loading && (!auth.user || (options?.admin && auth.user.role !== "admin"));
  useEffect(() => {
    if (blocked) navigate(auth.user ? "/home" : "/access");
  }, [blocked, auth.user, navigate]);
  return { ...auth, ready: !auth.loading && !blocked };
}
