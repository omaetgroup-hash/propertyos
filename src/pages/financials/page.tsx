import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Search, Trash2,
  Receipt, Building2, CalendarDays, Tag, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  formatCurrency, formatDateLong, EXPENSE_CATEGORIES, type Country,
} from "@/lib/locale.ts";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import AddExpenseDialog from "./_components/AddExpenseDialog.tsx";

// ── Summary stat card ─────────────────────────────────────────────────────────
type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: "green" | "red" | "blue" | "default";
};

function StatCard({ label, value, sub, icon, accent = "default" }: StatCardProps) {
  const iconColors = {
    green: "bg-emerald-500/10 text-emerald-600",
    red: "bg-red-500/10 text-red-600",
    blue: "bg-blue-500/10 text-blue-600",
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
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", iconColors[accent])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom tooltip for recharts ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Expense row ───────────────────────────────────────────────────────────────
type ExpenseItem = NonNullable<ReturnType<typeof useQuery<typeof api.expenses.list>>>[number];

function ExpenseRow({ expense }: { expense: ExpenseItem }) {
  const remove = useMutation(api.expenses.remove);

  async function handleDelete() {
    try {
      await remove({ id: expense._id as Id<"expenses"> });
      toast.success("Expense deleted");
    } catch {
      toast.error("Failed to delete expense");
    }
  }

  const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0 group hover:bg-muted/30 px-4 -mx-4 rounded-lg transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
        <Receipt className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {expense.propertyName}
          </span>
          {expense.vendor && (
            <span className="text-xs text-muted-foreground">· {expense.vendor}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant="secondary" className="text-[11px] hidden sm:flex">
          <Tag className="w-3 h-3 mr-1" />
          {catLabel}
        </Badge>
        {expense.gstInclusive && (
          <Badge variant="secondary" className="text-[11px] hidden md:flex gap-1">
            <CheckCircle2 className="w-3 h-3" />
            GST
          </Badge>
        )}
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
            -{formatCurrency(expense.amount, expense.propertyCountry as Country)}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
            <CalendarDays className="w-3 h-3" />
            {formatDateLong(expense.date)}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
              <AlertDialogDescription>
                "{expense.description}" — {formatCurrency(expense.amount, expense.propertyCountry as Country)} on {formatDateLong(expense.date)}.
                This cannot be undone.
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
      </div>
    </div>
  );
}

// ── Chart colours for categories ──────────────────────────────────────────────
const CATEGORY_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

// ── Inner page (needs auth) ───────────────────────────────────────────────────
function FinancialsInner() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search, 300);

  const expenses = useQuery(api.expenses.list, {});
  const stats = useQuery(api.expenses.getFinancialStats, {});
  const properties = useQuery(api.properties.list, {});

  // ── Filtered expense list ─────────────────────────────────────────────────
  const filtered = (expenses ?? []).filter((e) => {
    const matchSearch =
      !debouncedSearch ||
      e.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.propertyName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (e.vendor ?? "").toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchProp = propertyFilter === "all" || e.propertyId === propertyFilter;
    return matchSearch && matchCat && matchProp;
  });

  const isLoading = expenses === undefined || stats === undefined;

  // ── Category breakdown data for chart ────────────────────────────────────
  const categoryChartData = stats
    ? Object.entries(stats.byCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([cat, amount], i) => ({
          name: EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat,
          amount,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] ?? "#6366f1",
        }))
    : [];

  // ── Monthly trend — merge income + expense ────────────────────────────────
  const trendData = stats?.monthlyTrend.map((m) => ({
    month: m.month,
    expenses: m.amount,
    income: stats.monthlyIncome,  // flat line — we don't have monthly income history
  })) ?? [];

  const netIsPositive = (stats?.netAnnual ?? 0) >= 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financials</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Income, expenses & portfolio profitability
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Record Expense
        </Button>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Annual Income"
            value={formatCurrency(stats?.annualIncome ?? 0)}
            sub={`${formatCurrency(stats?.weeklyIncome ?? 0)}/wk from active leases`}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="green"
          />
          <StatCard
            label="Total Expenses"
            value={formatCurrency(stats?.totalExpenses ?? 0)}
            sub="All recorded expenses"
            icon={<TrendingDown className="w-5 h-5" />}
            accent="red"
          />
          <StatCard
            label="Net Profit"
            value={formatCurrency(stats?.netAnnual ?? 0)}
            sub={netIsPositive ? "Profitable portfolio" : "Running at a loss"}
            icon={<DollarSign className="w-5 h-5" />}
            accent={netIsPositive ? "green" : "red"}
          />
          <StatCard
            label="Monthly Rent"
            value={formatCurrency(stats?.monthlyIncome ?? 0)}
            sub="52-week equivalent"
            icon={<CalendarDays className="w-5 h-5" />}
            accent="blue"
          />
        </div>
      )}

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Monthly expense trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Monthly Expense Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </CardHeader>
            <CardContent>
              {trendData.every((d) => d.expenses === 0) ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                  No expense data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Expense by category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle>
              <p className="text-xs text-muted-foreground">All time breakdown</p>
            </CardHeader>
            <CardContent>
              {categoryChartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                  No expense data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={categoryChartData}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                      {categoryChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Expense ledger ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold">Expense Ledger</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
            {expenses && filtered.length !== expenses.length && ` (filtered from ${expenses.length})`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search description, property, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
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

        {/* List */}
        {expenses === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Receipt /></EmptyMedia>
              <EmptyTitle>
                {expenses.length === 0 ? "No expenses recorded" : "No expenses match your filters"}
              </EmptyTitle>
              <EmptyDescription>
                {expenses.length === 0
                  ? "Start recording expenses to track your portfolio costs"
                  : "Try adjusting your search or filters"}
              </EmptyDescription>
            </EmptyHeader>
            {expenses.length === 0 && (
              <EmptyContent>
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Record Expense
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <Card>
            <CardContent className="px-4 py-2">
              {filtered.map((e) => (
                <ExpenseRow key={e._id} expense={e} />
              ))}

              {/* Totals footer */}
              <div className="flex items-center justify-between pt-3 pb-1 mt-2 border-t border-border">
                <span className="text-xs text-muted-foreground font-medium">
                  Total ({filtered.length} {filtered.length === 1 ? "expense" : "expenses"})
                </span>
                <span className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                  -{formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AddExpenseDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Sign in to view financials</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <FinancialsInner />
      </Authenticated>
    </>
  );
}
