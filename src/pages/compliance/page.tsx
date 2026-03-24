import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, Plus, Search,
  MoreHorizontal, CalendarDays, Building2, RefreshCw, AlertTriangle,
  CheckCircle2, FileWarning,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatDateLong, COMPLIANCE_TYPES } from "@/lib/locale.ts";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import AddComplianceDialog from "./_components/AddComplianceDialog.tsx";

type ComplianceStatus = "compliant" | "pending" | "overdue" | "expired";

const STATUS_CONFIG: Record<ComplianceStatus, {
  label: string; className: string; icon: React.ReactNode;
}> = {
  compliant: { label: "Compliant",  className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: <ShieldCheck className="w-3 h-3" /> },
  pending:   { label: "Pending",    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",       icon: <Clock className="w-3 h-3" /> },
  overdue:   { label: "Overdue",    className: "bg-red-500/10 text-red-700 dark:text-red-400",             icon: <ShieldAlert className="w-3 h-3" /> },
  expired:   { label: "Expired",    className: "bg-muted text-muted-foreground",                           icon: <ShieldX className="w-3 h-3" /> },
};

function StatCard({ label, value, sub, icon, accent = "default" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent?: "green" | "red" | "amber" | "blue" | "default";
}) {
  const colors = {
    green:   "bg-emerald-500/10 text-emerald-600",
    red:     "bg-red-500/10 text-red-600",
    amber:   "bg-amber-500/10 text-amber-600",
    blue:    "bg-blue-500/10 text-blue-600",
    default: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", colors[accent])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ComplianceItem = NonNullable<ReturnType<typeof useQuery<typeof api.compliance.list>>>[number];

function ComplianceCard({ item }: { item: ComplianceItem }) {
  const updateStatus = useMutation(api.compliance.updateStatus);
  const remove = useMutation(api.compliance.remove);

  const status = item.status as ComplianceStatus;
  const cfg = STATUS_CONFIG[status];
  const typeLabel = COMPLIANCE_TYPES.find((t) => t.value === item.type)?.label ?? item.type;

  const now = new Date().toISOString().split("T")[0] as string;
  const isOverdue = status === "overdue" || (status !== "compliant" && item.dueDate < now);

  const daysUntilDue = Math.ceil(
    (new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  async function setStatus(s: ComplianceStatus) {
    try {
      await updateStatus({ id: item._id as Id<"compliance">, status: s });
      toast.success(`Marked as ${s}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    try {
      await remove({ id: item._id as Id<"compliance"> });
      toast.success("Compliance item deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <Card className={cn(
      "hover:shadow-sm transition-all hover:border-primary/20",
      (status === "overdue" || status === "expired") && "border-red-200 dark:border-red-900/40"
    )}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5",
              status === "compliant" ? "bg-emerald-500/10 text-emerald-600"
              : status === "overdue" || status === "expired" ? "bg-red-500/10 text-red-600"
              : "bg-amber-500/10 text-amber-600"
            )}>
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{typeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className={cn("gap-1 text-xs", cfg.className)}>
              {cfg.icon} {cfg.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status !== "compliant" && (
                  <DropdownMenuItem onClick={() => setStatus("compliant")}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Mark Compliant
                  </DropdownMenuItem>
                )}
                {status !== "pending" && (
                  <DropdownMenuItem onClick={() => setStatus("pending")}>
                    <Clock className="w-4 h-4 mr-2 text-amber-600" /> Mark Pending
                  </DropdownMenuItem>
                )}
                {status !== "overdue" && (
                  <DropdownMenuItem onClick={() => setStatus("overdue")}>
                    <ShieldAlert className="w-4 h-4 mr-2 text-red-600" /> Mark Overdue
                  </DropdownMenuItem>
                )}
                {status !== "expired" && (
                  <DropdownMenuItem onClick={() => setStatus("expired")}>
                    <ShieldX className="w-4 h-4 mr-2" /> Mark Expired
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
                      <AlertDialogTitle>Delete this compliance item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{item.title}" will be permanently removed.
                      </AlertDialogDescription>
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

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Property
            </p>
            <p className="font-medium truncate">
              {item.propertyCountry === "nz" ? "🇳🇿" : "🇦🇺"} {item.propertyName}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className={cn("flex items-center gap-1", isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
              <CalendarDays className="w-3 h-3" /> Due Date
            </p>
            <p className={cn("font-medium", isOverdue && "text-red-600 dark:text-red-400")}>
              {formatDateLong(item.dueDate)}
              {!isOverdue && daysUntilDue <= 30 && daysUntilDue > 0 && (
                <span className="ml-1 text-amber-600">({daysUntilDue}d)</span>
              )}
            </p>
          </div>
          {item.authority && (
            <div className="space-y-0.5 col-span-2">
              <p className="text-muted-foreground">Authority</p>
              <p className="font-medium">{item.authority}</p>
            </div>
          )}
          {item.renewalDate && (
            <div className="space-y-0.5">
              <p className="text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Renewal
              </p>
              <p className="font-medium">{formatDateLong(item.renewalDate)}</p>
            </div>
          )}
        </div>

        {item.notes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceInner() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ComplianceStatus>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search, 300);

  const items = useQuery(api.compliance.list, {});
  const stats = useQuery(api.compliance.getStats, {});
  const properties = useQuery(api.properties.list, {});

  const filtered = (items ?? []).filter((i) => {
    const matchSearch =
      !debouncedSearch ||
      i.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      i.propertyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (i.authority ?? "").toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchProp = propertyFilter === "all" || i.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchProp;
  });

  const urgentItems = (items ?? []).filter(
    (i) => i.status === "overdue" || i.status === "expired"
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track permits, certifications and regulatory requirements
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Stats */}
      {stats === undefined || stats === null ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Compliant" value={`${stats.compliant} / ${stats.total}`} sub="Items in order" icon={<ShieldCheck className="w-5 h-5" />} accent="green" />
          <StatCard label="Pending" value={stats.pending} sub="Action needed" icon={<Clock className="w-5 h-5" />} accent={stats.pending > 0 ? "amber" : "default"} />
          <StatCard label="Overdue / Expired" value={stats.overdue + stats.expired} sub="Immediate action" icon={<ShieldAlert className="w-5 h-5" />} accent={stats.overdue + stats.expired > 0 ? "red" : "default"} />
          <StatCard label="Due in 30 Days" value={stats.upcomingIn30} sub="Plan ahead" icon={<CalendarDays className="w-5 h-5" />} accent={stats.upcomingIn30 > 0 ? "amber" : "default"} />
        </div>
      )}

      {/* Urgent alert */}
      {urgentItems.length > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>{urgentItems.length} {urgentItems.length === 1 ? "item" : "items"}</strong> require immediate attention:{" "}
            {urgentItems.map((i) => i.title).join(", ")}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title, property, authority..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {(properties ?? []).map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.country === "nz" ? "🇳🇿" : "🇦🇺"} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {items === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileWarning /></EmptyMedia>
            <EmptyTitle>{items.length === 0 ? "No compliance items yet" : "No items match your filters"}</EmptyTitle>
            <EmptyDescription>
              {items.length === 0
                ? "Add compliance certificates, permits and regulatory items to track their status"
                : "Try adjusting your search or filters"}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => <ComplianceCard key={item._id} item={item} />)}
        </div>
      )}

      <AddComplianceDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

export default function CompliancePage() {
  return (
    <>
      <AuthLoading>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Sign in to view compliance</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ComplianceInner />
      </Authenticated>
    </>
  );
}
