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
  Zap, Flame, Droplets, Wifi, Building2, Trash2 as TrashIcon,
  CircleHelp, Plus, Search, MoreHorizontal, CheckCircle2,
  Clock, AlertTriangle, CalendarDays, DollarSign, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatCurrency, formatDateLong, UTILITY_TYPES, type Country } from "@/lib/locale.ts";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import AddUtilityDialog from "./_components/AddUtilityDialog.tsx";

// ── Utility type icon map ─────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ReactNode> = {
  electricity: <Zap className="w-4 h-4" />,
  gas:         <Flame className="w-4 h-4" />,
  water:       <Droplets className="w-4 h-4" />,
  broadband:   <Wifi className="w-4 h-4" />,
  rates:       <Building2 className="w-4 h-4" />,
  body_corporate: <Building2 className="w-4 h-4" />,
  rubbish:     <TrashIcon className="w-4 h-4" />,
  other:       <CircleHelp className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  electricity: "bg-yellow-500/10 text-yellow-600",
  gas:         "bg-orange-500/10 text-orange-600",
  water:       "bg-blue-500/10 text-blue-600",
  broadband:   "bg-indigo-500/10 text-indigo-600",
  rates:       "bg-slate-500/10 text-slate-600",
  body_corporate: "bg-purple-500/10 text-purple-600",
  rubbish:     "bg-green-500/10 text-green-600",
  other:       "bg-muted text-muted-foreground",
};

// ── Status config ─────────────────────────────────────────────────────────────
type UtilityStatus = "paid" | "pending" | "overdue";

const STATUS_CONFIG: Record<UtilityStatus, { label: string; className: string; icon: React.ReactNode }> = {
  paid:    { label: "Paid",    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",    icon: <Clock className="w-3 h-3" /> },
  overdue: { label: "Overdue", className: "bg-red-500/10 text-red-700 dark:text-red-400",          icon: <AlertTriangle className="w-3 h-3" /> },
};

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, accent = "default",
}: {
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
            <p className="text-2xl font-bold tabular-nums truncate">{value}</p>
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

// ── Utility card ──────────────────────────────────────────────────────────────
type UtilityItem = NonNullable<ReturnType<typeof useQuery<typeof api.utilities.list>>>[number];

function UtilityCard({ utility }: { utility: UtilityItem }) {
  const updateStatus = useMutation(api.utilities.updateStatus);
  const remove = useMutation(api.utilities.remove);

  const status = utility.status as UtilityStatus;
  const statusCfg = STATUS_CONFIG[status];
  const typeIcon = TYPE_ICONS[utility.type] ?? <CircleHelp className="w-4 h-4" />;
  const typeColor = TYPE_COLORS[utility.type] ?? TYPE_COLORS.other;
  const typeLabel = UTILITY_TYPES.find((t) => t.value === utility.type)?.label ?? utility.type;

  async function setStatus(s: UtilityStatus) {
    try {
      await updateStatus({ id: utility._id as Id<"utilities">, status: s });
      toast.success(`Marked as ${s}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    try {
      await remove({ id: utility._id as Id<"utilities"> });
      toast.success("Utility bill deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  const isOverdue = status === "overdue";

  return (
    <Card className={cn(
      "hover:shadow-sm transition-all hover:border-primary/20",
      isOverdue && "border-red-200 dark:border-red-900/50"
    )}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", typeColor)}>
              {typeIcon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{utility.provider}</p>
              <p className="text-xs text-muted-foreground truncate">{typeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className={cn("gap-1 text-xs", statusCfg.className)}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status !== "paid" && (
                  <DropdownMenuItem onClick={() => setStatus("paid")}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Mark as Paid
                  </DropdownMenuItem>
                )}
                {status !== "pending" && (
                  <DropdownMenuItem onClick={() => setStatus("pending")}>
                    <Clock className="w-4 h-4 mr-2 text-amber-600" /> Mark as Pending
                  </DropdownMenuItem>
                )}
                {status !== "overdue" && (
                  <DropdownMenuItem onClick={() => setStatus("overdue")}>
                    <AlertTriangle className="w-4 h-4 mr-2 text-red-600" /> Mark as Overdue
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
                      <AlertDialogTitle>Delete this utility bill?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {utility.provider} — {formatCurrency(utility.amount, utility.propertyCountry as Country)} will be permanently removed.
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

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Property
            </p>
            <p className="font-medium truncate">
              {utility.propertyCountry === "nz" ? "🇳🇿" : "🇦🇺"} {utility.propertyName}
              {utility.unitNumber && ` · Unit ${utility.unitNumber}`}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Amount
            </p>
            <p className="font-semibold text-foreground">
              {formatCurrency(utility.amount, utility.propertyCountry as Country)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Bill Date
            </p>
            <p className="font-medium">{formatDateLong(utility.billingDate)}</p>
          </div>
          <div className="space-y-0.5">
            <p className={cn("flex items-center gap-1", isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
              <CalendarDays className="w-3 h-3" /> Due Date
            </p>
            <p className={cn("font-medium", isOverdue && "text-red-600 dark:text-red-400")}>
              {formatDateLong(utility.dueDate)}
            </p>
          </div>
        </div>

        {/* Account number */}
        {utility.accountNumber && (
          <div className="pt-1 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Account: <span className="font-mono">{utility.accountNumber}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────────
function UtilitiesInner() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UtilityStatus>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search, 300);

  const utilities = useQuery(api.utilities.list, {});
  const stats = useQuery(api.utilities.getStats, {});
  const properties = useQuery(api.properties.list, {});

  const filtered = (utilities ?? []).filter((u) => {
    const matchSearch =
      !debouncedSearch ||
      u.provider.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.propertyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (u.accountNumber ?? "").includes(debouncedSearch);
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    const matchType = typeFilter === "all" || u.type === typeFilter;
    const matchProp = propertyFilter === "all" || u.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchType && matchProp;
  });

  const overdueItems = (utilities ?? []).filter((u) => u.status === "overdue");

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilities</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track bills and utility accounts across your portfolio
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Record Bill
        </Button>
      </div>

      {/* Stats */}
      {stats === undefined || stats === null ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Outstanding Total"
            value={formatCurrency(stats.outstanding)}
            sub="Pending + overdue bills"
            icon={<DollarSign className="w-5 h-5" />}
            accent={stats.outstanding > 0 ? "amber" : "green"}
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            sub="Immediate action needed"
            icon={<AlertTriangle className="w-5 h-5" />}
            accent={stats.overdue > 0 ? "red" : "default"}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            sub="Awaiting payment"
            icon={<Clock className="w-5 h-5" />}
            accent={stats.pending > 0 ? "amber" : "default"}
          />
          <StatCard
            label="Paid"
            value={stats.paid}
            sub={`of ${stats.total} total bills`}
            icon={<CheckCircle2 className="w-5 h-5" />}
            accent="green"
          />
        </div>
      )}

      {/* Overdue alert banner */}
      {overdueItems.length > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">{overdueItems.length} overdue {overdueItems.length === 1 ? "bill" : "bills"}</span>
            {" — "}
            {overdueItems.map((u) => u.provider).join(", ")}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search provider, property, account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {UTILITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-44">
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
      {utilities === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Receipt /></EmptyMedia>
            <EmptyTitle>
              {utilities.length === 0 ? "No utility bills recorded" : "No bills match your filters"}
            </EmptyTitle>
            <EmptyDescription>
              {utilities.length === 0
                ? "Start tracking electricity, water, gas and other bills across your portfolio"
                : "Try adjusting your search or filters"}
            </EmptyDescription>
          </EmptyHeader>
          {utilities.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Record Bill
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((u) => <UtilityCard key={u._id} utility={u} />)}
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Showing {filtered.length} {filtered.length === 1 ? "bill" : "bills"}
            {" · "}Total outstanding: {formatCurrency(
              filtered
                .filter((u) => u.status !== "paid")
                .reduce((s, u) => s + u.amount, 0)
            )}
          </p>
        </>
      )}

      <AddUtilityDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

export default function UtilitiesPage() {
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
            <p className="text-muted-foreground text-sm">Sign in to view utilities</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <UtilitiesInner />
      </Authenticated>
    </>
  );
}
