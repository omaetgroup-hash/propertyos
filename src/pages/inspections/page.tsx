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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ClipboardCheck, Plus, Search, MoreHorizontal, CalendarDays,
  Building2, User, AlertTriangle, CheckCircle2, Clock,
  XCircle, Loader, Star,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatDateLong, INSPECTION_TYPES } from "@/lib/locale.ts";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import AddInspectionDialog from "./_components/AddInspectionDialog.tsx";

type InspectionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
type Condition = "excellent" | "good" | "fair" | "poor";

const STATUS_CONFIG: Record<InspectionStatus, {
  label: string; className: string; icon: React.ReactNode;
}> = {
  scheduled:   { label: "Scheduled",   className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",     icon: <CalendarDays className="w-3 h-3" /> },
  in_progress: { label: "In Progress", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",  icon: <Loader className="w-3 h-3" /> },
  completed:   { label: "Completed",   className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:   { label: "Cancelled",   className: "bg-muted text-muted-foreground",                       icon: <XCircle className="w-3 h-3" /> },
};

const CONDITION_CONFIG: Record<Condition, { label: string; className: string }> = {
  excellent: { label: "Excellent", className: "text-emerald-600" },
  good:      { label: "Good",      className: "text-blue-600" },
  fair:      { label: "Fair",      className: "text-amber-600" },
  poor:      { label: "Poor",      className: "text-red-600" },
};

// ── Complete inspection dialog ─────────────────────────────────────────────────
const completeSchema = z.object({
  completedDate: z.string().min(1, "Date required"),
  overallCondition: z.enum(["excellent", "good", "fair", "poor"]),
  notes: z.string().optional(),
});

type CompleteValues = z.infer<typeof completeSchema>;

function CompleteInspectionDialog({
  open, onClose, inspectionId,
}: { open: boolean; onClose: () => void; inspectionId: Id<"inspections"> | null }) {
  const complete = useMutation(api.inspections.complete);
  const today = new Date().toISOString().split("T")[0] as string;

  const form = useForm<CompleteValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { completedDate: today, overallCondition: "good", notes: "" },
  });

  async function onSubmit(values: CompleteValues) {
    if (!inspectionId) return;
    try {
      await complete({ id: inspectionId, ...values });
      toast.success("Inspection marked as completed");
      form.reset();
      onClose();
    } catch {
      toast.error("Failed to complete inspection");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Inspection</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="completedDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Completed Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="overallCondition" render={({ field }) => (
              <FormItem>
                <FormLabel>Overall Condition</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor — Urgent attention needed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea placeholder="Findings, issues, recommendations..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Mark Complete"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
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

// ── Inspection card ────────────────────────────────────────────────────────────
type InspectionItem = NonNullable<ReturnType<typeof useQuery<typeof api.inspections.list>>>[number];

function InspectionCard({ item, onComplete }: {
  item: InspectionItem;
  onComplete: (id: Id<"inspections">) => void;
}) {
  const updateStatus = useMutation(api.inspections.updateStatus);
  const remove = useMutation(api.inspections.remove);

  const status = item.status as InspectionStatus;
  const cfg = STATUS_CONFIG[status];
  const typeLabel = INSPECTION_TYPES.find((t) => t.value === item.type)?.label ?? item.type;

  const now = new Date().toISOString().split("T")[0] as string;
  const isOverdue = status === "scheduled" && item.scheduledDate < now;

  async function setStatus(s: InspectionStatus) {
    try {
      await updateStatus({ id: item._id as Id<"inspections">, status: s });
      toast.success(`Marked as ${s.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete() {
    try {
      await remove({ id: item._id as Id<"inspections"> });
      toast.success("Inspection deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <Card className={cn(
      "hover:shadow-sm transition-all hover:border-primary/20",
      isOverdue && "border-red-200 dark:border-red-900/40"
    )}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5",
              status === "completed" ? "bg-emerald-500/10 text-emerald-600"
              : isOverdue ? "bg-red-500/10 text-red-600"
              : status === "in_progress" ? "bg-amber-500/10 text-amber-600"
              : "bg-blue-500/10 text-blue-600"
            )}>
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">{typeLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {item.propertyCountry === "nz" ? "🇳🇿" : "🇦🇺"} {item.propertyName}
                {item.unitNumber && ` · Unit ${item.unitNumber}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className={cn("gap-1 text-xs", cfg.className, isOverdue && "bg-red-500/10 text-red-700 dark:text-red-400")}>
              {isOverdue ? <AlertTriangle className="w-3 h-3" /> : cfg.icon}
              {isOverdue ? "Overdue" : cfg.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status !== "completed" && (
                  <DropdownMenuItem onClick={() => onComplete(item._id as Id<"inspections">)}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Mark Complete
                  </DropdownMenuItem>
                )}
                {status !== "in_progress" && status !== "completed" && (
                  <DropdownMenuItem onClick={() => setStatus("in_progress")}>
                    <Loader className="w-4 h-4 mr-2 text-amber-600" /> Start Inspection
                  </DropdownMenuItem>
                )}
                {status !== "cancelled" && status !== "completed" && (
                  <DropdownMenuItem onClick={() => setStatus("cancelled")}>
                    <XCircle className="w-4 h-4 mr-2" /> Cancel
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
                      <AlertDialogTitle>Delete this inspection?</AlertDialogTitle>
                      <AlertDialogDescription>This record will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
            <p className={cn("flex items-center gap-1", isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
              <CalendarDays className="w-3 h-3" /> Scheduled
            </p>
            <p className={cn("font-medium", isOverdue && "text-red-600 dark:text-red-400")}>
              {formatDateLong(item.scheduledDate)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Inspector
            </p>
            <p className="font-medium truncate">{item.inspectorName}</p>
          </div>
          {item.completedDate && (
            <div className="space-y-0.5">
              <p className="text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </p>
              <p className="font-medium">{formatDateLong(item.completedDate)}</p>
            </div>
          )}
          {item.overallCondition && (
            <div className="space-y-0.5">
              <p className="text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" /> Condition
              </p>
              <p className={cn("font-semibold", CONDITION_CONFIG[item.overallCondition as Condition]?.className)}>
                {CONDITION_CONFIG[item.overallCondition as Condition]?.label}
              </p>
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

// ── Inner page ─────────────────────────────────────────────────────────────────
function InspectionsInner() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InspectionStatus>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [completeId, setCompleteId] = useState<Id<"inspections"> | null>(null);
  const [debouncedSearch] = useDebounce(search, 300);

  const items = useQuery(api.inspections.list, {});
  const stats = useQuery(api.inspections.getStats, {});
  const properties = useQuery(api.properties.list, {});

  const now = new Date().toISOString().split("T")[0] as string;

  const filtered = (items ?? []).filter((i) => {
    const matchSearch =
      !debouncedSearch ||
      i.propertyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      i.inspectorName.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchType = typeFilter === "all" || i.type === typeFilter;
    const matchProp = propertyFilter === "all" || i.propertyId === propertyFilter;
    return matchSearch && matchStatus && matchType && matchProp;
  });

  const overdueItems = (items ?? []).filter(
    (i) => i.status === "scheduled" && i.scheduledDate < now
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inspections</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule and track property inspections</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Schedule Inspection
        </Button>
      </div>

      {/* Stats */}
      {stats === undefined || stats === null ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Scheduled" value={stats.scheduled} sub="Upcoming inspections" icon={<CalendarDays className="w-5 h-5" />} accent="blue" />
          <StatCard label="In Progress" value={stats.inProgress} sub="Currently active" icon={<Loader className="w-5 h-5" />} accent={stats.inProgress > 0 ? "amber" : "default"} />
          <StatCard label="Completed" value={stats.completed} sub="All time" icon={<CheckCircle2 className="w-5 h-5" />} accent="green" />
          <StatCard label="Overdue" value={stats.overdue} sub="Past scheduled date" icon={<AlertTriangle className="w-5 h-5" />} accent={stats.overdue > 0 ? "red" : "default"} />
        </div>
      )}

      {/* Overdue alert */}
      {overdueItems.length > 0 && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>{overdueItems.length} overdue {overdueItems.length === 1 ? "inspection" : "inspections"}</strong> — scheduled dates have passed:{" "}
            {overdueItems.map((i) => `${i.propertyName} (${formatDateLong(i.scheduledDate)})`).join(", ")}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search property or inspector..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {INSPECTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
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
            <EmptyMedia variant="icon"><ClipboardCheck /></EmptyMedia>
            <EmptyTitle>{items.length === 0 ? "No inspections yet" : "No inspections match your filters"}</EmptyTitle>
            <EmptyDescription>
              {items.length === 0
                ? "Schedule your first inspection to start tracking property condition"
                : "Try adjusting your search or filters"}
            </EmptyDescription>
          </EmptyHeader>
          {items.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Schedule Inspection
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <InspectionCard key={item._id} item={item} onComplete={setCompleteId} />
          ))}
        </div>
      )}

      <AddInspectionDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <CompleteInspectionDialog
        open={completeId !== null}
        onClose={() => setCompleteId(null)}
        inspectionId={completeId}
      />
    </div>
  );
}

export default function InspectionsPage() {
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
            <p className="text-muted-foreground text-sm">Sign in to view inspections</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <InspectionsInner />
      </Authenticated>
    </>
  );
}
