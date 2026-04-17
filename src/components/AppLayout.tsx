import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import AppSidebar from "@/components/AppSidebar.tsx";
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Building2, Loader2 } from "lucide-react";

function SignInPage() {
  const { signIn } = useAuthActions();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "(not set)";

  const handleSignIn = async () => {
    setError(null);
    setPending(true);
    try {
      const result = await signIn("google");
      // If we get here without a page navigation, show the result
      setError("signIn resolved without redirect: " + JSON.stringify(result));
    } catch (err) {
      console.error("Sign in error:", err);
      const msg = err instanceof Error
        ? `${err.name}: ${err.message}`
        : JSON.stringify(err, Object.getOwnPropertyNames(err as object));
      setError(msg || "Unknown error (empty message)");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="text-center space-y-6 max-w-sm px-6">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-sidebar-primary/20 border border-sidebar-border">
            <Building2 className="w-8 h-8 text-sidebar-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">PropertyOS</h1>
          <p className="text-sidebar-foreground/60 text-sm leading-relaxed">
            Property management for New Zealand and Australia — residential, commercial, compliance and more.
          </p>
        </div>
        <button
          onClick={handleSignIn}
          disabled={pending}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: pending ? "#555" : "#4285F4",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {pending && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
          {pending ? "Signing in..." : "Sign in with Google"}
        </button>
        {error && (
          <p style={{ color: "red", fontSize: "13px", wordBreak: "break-word" }}>
            Error: {error}
          </p>
        )}
        <p className="text-[10px] text-sidebar-foreground/30 break-all">
          backend: {convexUrl}
        </p>
      </div>
    </div>
  );
}

function LoadingLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 space-y-2">
        <Skeleton className="h-10 w-full bg-sidebar-accent/30" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full bg-sidebar-accent/20" />
        ))}
      </div>
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);

  // Ensure user record exists in DB whenever authenticated
  useEffect(() => {
    if (isAuthenticated) {
      updateCurrentUser();
    }
  }, [isAuthenticated, updateCurrentUser]);

  return (
    <>
      <AuthLoading>
        <LoadingLayout />
      </AuthLoading>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
      <Authenticated>
        {currentUser === undefined ? (
          <LoadingLayout />
        ) : (
          <div className="flex min-h-screen bg-background">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        )}
      </Authenticated>
    </>
  );
}
