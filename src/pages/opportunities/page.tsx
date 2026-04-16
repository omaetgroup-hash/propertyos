import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { TrendingUp, Plus } from "lucide-react";
import { calculateDeal, formatCurrency } from "@/lib/deal-calculator.ts";
import OpportunityCard from "./_components/OpportunityCard.tsx";
import OpportunityDialog from "./_components/OpportunityDialog.tsx";

type Opportunity = Doc<"opportunities">;

export default function OpportunitiesPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Sign in to view Opportunities.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </AuthLoading>
      <Authenticated>
        <OpportunitiesInner />
      </Authenticated>
    </>
  );
}

function OpportunitiesInner() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const opportunities = useQuery(api.opportunities.list, {});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Opportunity | null>(null);

  if (currentUser === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (opp: Opportunity) => {
    setEditTarget(opp);
    setDialogOpen(true);
  };

  // Summary stats
  const stats = (() => {
    if (!opportunities) return null;
    const profitable = opportunities.filter((o) => {
      const m = calculateDeal({ ...o });
      return m.viability === "profitable";
    }).length;
    const totalMonthlyProfit = opportunities.reduce((sum, o) => {
      const m = calculateDeal({ ...o });
      return sum + m.monthlyProfit;
    }, 0);
    return { total: opportunities.length, profitable, totalMonthlyProfit };
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evaluate deals before committing to a lease
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Opportunity
        </Button>
      </div>

      {/* Summary Cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b bg-muted/20">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Deals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.profitable}</p>
            <p className="text-xs text-muted-foreground">Profitable</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${stats.totalMonthlyProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(stats.totalMonthlyProfit)}
            </p>
            <p className="text-xs text-muted-foreground">Combined Monthly Profit</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!opportunities ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrendingUp />
              </EmptyMedia>
              <EmptyTitle>No opportunities yet</EmptyTitle>
              <EmptyDescription>
                Add a potential deal to analyse its profitability before committing.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                New Opportunity
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp._id} opportunity={opp} onEdit={openEdit} />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <OpportunityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        opportunity={editTarget}
      />
    </div>
  );
}
