import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Building2 } from "lucide-react";

function SignInPage() {
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
            Professional property management platform for residential and commercial portfolios.
          </p>
        </div>
        <SignInButton className="w-full" />
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
  return (
    <>
      <AuthLoading>
        <LoadingLayout />
      </AuthLoading>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
      <Authenticated>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </Authenticated>
    </>
  );
}
