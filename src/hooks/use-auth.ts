import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export function useAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  return {
    isAuthenticated,
    isLoading,
    error: null as Error | null,
    signinRedirect: () => signIn("google"),
    removeUser: signOut,
  };
}
