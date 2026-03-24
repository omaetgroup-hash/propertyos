import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  FileText, Plus, Search, MoreHorizontal, CheckCircle2,
  Clock, XCircle, RefreshCw, CalendarDays, DollarSign, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatCurrency, formatDateLong, type Country } from "@/lib/locale.ts";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import AddLeaseDialog from "./_components/AddLeaseDialog.tsx";

type LeaseStatus = "active" | "periodic" | "pending" | "expired" | "terminated";

const STATUS_CONFIG: Record<LeaseStatus, { label: string; className: string; icon: React.ReactNode }> = {
  active: { label: "Active — Fixed Term", className: "bg-emerald-500/10 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  periodic: { label: "Periodic", className: "bg-blue-500/10 text-blue-700", icon: <RefreshCw className="w-3 h-3" /> },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700", icon: <Clock className="w-3 h-3" /> },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground", icon: <XCircle className="w-3 h-3" /> },
  terminated: { label: "Terminated", className: "bg-red-500/10 text-red-700", icon: <XCircle className="w-3 h-3" /> },
};

function LeaseCard({ lease }: { lease: ReturnType<typeof useQuery<typeof api.leases.list>>[number] }) {
  const updateStatus = useMutation(api.leases.updateStatus);
  const removeLease = useMutation(api.leases.remove);
  const config = STATUS_CONFIG[lease.status];

  async function changeStatus(status: LeaseStatus) {
    try {
      await updateStatus({ id: lease._id, status });
      toast.success(`Tenancy marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    try {
      await removeLease({ id: lease._id as Id<"leases"> });
      toast.success("Tenancy removed");
    } catch {
      toast.error("Failed to remove tenancy");
    }
  }

  const isActive = lease.status === "active" || lease.status === "periodic";
  const monthlyEquiv = Math.round(lease.weeklyRent * (52 / 12));

  return (
    <Card className="hover:shadow-sm hover:border-primary/20 transition-all">
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{lease.tenantName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {lease.propertyCountry === "nz" ? "🇳🇿" : "🇦🇺"} {lease.propertyName} · Unit {lease.unitNumber}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className={cn("gap-1 text-xs", config.className)}>
              {config.icon}{config.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {lease.status !== "active" && (
                  <DropdownMenuItem onClick={() => changeStatus("active")}>Mark as Active</DropdownMenuItem>
                )}
                {lease.status !== "periodic" && (
                  <DropdownMenuItem onClick={() => changeStatus("periodic")}>Mark as Periodic</DropdownMenuItem>
                )}
                {lease.status !== "terminated" && (
                  <DropdownMenuItem onClick={() => changeStatus("terminated")} className="text-destructive">
                    Terminate Tenancy
                  </DropdownMenuItem>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                      Delete Record
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this tenancy record?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Date + rent row */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Start</p>
            <p className="font-medium">{formatDateLong(lease.startDate)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> End</p>
            <p className="font-medium">{formatDateLong(lease.endDate)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Weekly Rent</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(lease.weeklyRent, lease.propertyCountry as Country)}/wk
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Bond</p>
            <p className="font-medium">{formatCurrency(lease.bondAmount, lease.propertyCountry as Country)}</p>
          </div>
        </div>

        {/* RTA + Monthly */}
        <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className={cn("w-3.5 h-3.5", lease.rtaLodged ? "text-emerald-600" : "text-muted-foreground")} />
            <span className={lease.rtaLodged ? "text-emerald-700" : "text-muted-foreground"}>
              Bond {lease.rtaLodged ? "lodged" : "not lodged"}
            </span>
          </div>
          {isActive && (
            <span className="text-muted-foreground">
              ≈ {formatCurrency(monthlyEquiv, lease.propertyCountry as Country)}/mth
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type LeaseItem = NonNullable<ReturnType<typeof useQuery<typeof api.leases.list>>>[number];

export default function LeasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeaseStatus>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search, 300);

  const leases = useQuery(api.leases.list, {});

  const filtered = (leases ?? []).filter((l) => {
    const matchesSearch =
      !debouncedSearch ||
      l.tenantName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      l.propertyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      l.unitNumber.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCounts = (leases ?? []).filter((l) => l.status === "active" || l.status === "periodic").length;
  const weeklyRoll = (leases ?? [])
    .filter((l) => l.status === "active" || l.status === "periodic")
    .reduce((sum, l) => sum + l.weeklyRent, 0);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenancy Agreements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {leases
              ? `${activeCounts} active · weekly rent roll $${weeklyRoll.toLocaleString()}`
              : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Tenancy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tenant, property or unit..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active — Fixed Term</SelectItem>
            <SelectItem value="periodic">Periodic</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {leases === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>{leases.length === 0 ? "No tenancies yet" : "No tenancies match your filters"}</EmptyTitle>
            <EmptyDescription>
              {leases.length === 0
                ? "Create your first tenancy agreement to link tenants to units"
                : "Try adjusting your search or filters"}
            </EmptyDescription>
          </EmptyHeader>
          {leases.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> New Tenancy
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => <LeaseCard key={l._id} lease={l} />)}
        </div>
      )}

      <AddLeaseDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
