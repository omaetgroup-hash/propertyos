import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  BookOpen, Plus, Download, Trash2, TrendingUp, TrendingDown,
  DollarSign, Receipt, Building2, CalendarDays, RefreshCw,
  CheckCircle2, Clock, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  formatCurrency, formatDateLong, getCategoryLabel, TRANSACTION_CATEGORIES,
  INCOME_CATEGORIES, ACCOUNTING_EXPENSE_CATEGORIES, type Country,
} from "@/lib/locale.ts";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import AddTransactionDialog from "./_components/AddTransactionDialog.tsx";

// ── Types ──────────────────────────────────────────────────────────────────────
type Transaction = NonNullable<ReturnType<typeof useQuery<typeof api.accounting.list>>>[number];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, accent = "default",
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent?: "green" | "red" | "blue" | "default";
}) {
  const colors = {
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
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", colors[accent])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Xero sync badge ───────────────────────────────────────────────────────────
function XeroBadge({ status }: { status: "not_synced" | "pending" | "synced" }) {
  if (status === "synced") return (
    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Synced
    </Badge>
  );
  if (status === "pending") return (
    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 gap-1">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  );
  return null;
}

// ── Transaction row ───────────────────────────────────────────────────────────
function TransactionRow({ tx, runningBalance }: { tx: Transaction; runningBalance: number }) {
  const remove = useMutation(api.accounting.remove);
  const markXero = useMutation(api.accounting.markXeroPending);
  const isIncome = tx.type === "income";

  async function handleDelete() {
    try {
      await remove({ id: tx._id as Id<"transactions"> });
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    }
  }

  async function handleXero() {
    try {
      await markXero({ id: tx._id as Id<"transactions"> });
      toast.success("Marked for Xero sync");
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0 group hover:bg-muted/30 px-4 -mx-4 rounded-lg transition-colors">
      {/* Type icon */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
        isIncome ? "bg-emerald-500/10" : "bg-red-500/10"
      )}>
        {isIncome
          ? <TrendingUp className="w-4 h-4 text-emerald-600" />
          : <TrendingDown className="w-4 h-4 text-red-600" />
        }
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {tx.propertyName}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {getCategoryLabel(tx.category)}
          </Badge>
          {tx.supplierId && (
            <span className="text-xs text-muted-foreground">· {tx.supplierId}</span>
          )}
          {tx.gstAmount > 0 && (
            <span className="text-[10px] text-muted-foreground">GST: {formatCurrency(tx.gstAmount, tx.propertyCountry as Country)}</span>
          )}
        </div>
      </div>

      {/* Amount + date + balance */}
      <div className="shrink-0 text-right space-y-0.5">
        <p className={cn(
          "text-sm font-semibold tabular-nums",
          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}>
          {isIncome ? "+" : "-"}{formatCurrency(tx.netAmount, tx.propertyCountry as Country)}
        </p>
        <p className="text-[11px] text-muted-foreground">{formatDateLong(tx.date)}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          Bal: {formatCurrency(runningBalance)}
        </p>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <XeroBadge status={tx.xeroSyncStatus} />
        {tx.xeroSyncStatus === "not_synced" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={handleXero}
            title="Mark for Xero sync"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Xero
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                "{tx.description}" — {formatCurrency(tx.amount, tx.propertyCountry as Country)} on {formatDateLong(tx.date)}.
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

// ── CSV export helper ─────────────────────────────────────────────────────────
function exportCSV(rows: Transaction[]) {
  const headers = ["Date", "Type", "Category", "Description", "Property", "Supplier", "Gross", "GST", "Net", "Xero Status"];
  const lines = rows.map((t) => [
    t.date,
    t.type,
    getCategoryLabel(t.category),
    `"${t.description.replace(/"/g, '""')}"`,
    `"${t.propertyName}"`,
    t.supplierId ?? "",
    t.amount.toFixed(2),
    t.gstAmount.toFixed(2),
    t.netAmount.toFixed(2),
    t.xeroSyncStatus,
  ].join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Transactions tab ──────────────────────────────────────────────────────────
function TransactionsTab({ onAddClick }: { onAddClick: () => void }) {
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const transactions = useQuery(api.accounting.list, {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const properties = useQuery(api.properties.list, {});

  const filtered = useMemo(() => {
    return (transactions ?? []).filter((t) => {
      const matchProp = propertyFilter === "all" || t.propertyId === propertyFilter;
      const matchType = typeFilter === "all" || t.type === typeFilter;
      const matchCat = categoryFilter === "all" || t.category === categoryFilter;
      return matchProp && matchType && matchCat;
    });
  }, [transactions, propertyFilter, typeFilter, categoryFilter]);

  // Running balance (oldest-first, then reverse for display)
  const withBalance = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    let balance = 0;
    const withBal = sorted.map((t) => {
      balance += t.type === "income" ? t.netAmount : -t.netAmount;
      return { tx: t, balance };
    });
    return withBal.reverse();
  }, [filtered]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.netAmount, 0);
  const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.netAmount, 0);
  const net = totalIncome - totalExpenses;

  if (transactions === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Income"
          value={formatCurrency(totalIncome)}
          sub={`${filtered.filter((t) => t.type === "income").length} transactions`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="green"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(totalExpenses)}
          sub={`${filtered.filter((t) => t.type === "expense").length} transactions`}
          icon={<TrendingDown className="w-5 h-5" />}
          accent="red"
        />
        <StatCard
          label="Net Position"
          value={formatCurrency(Math.abs(net))}
          sub={net >= 0 ? "Surplus" : "Deficit"}
          icon={<DollarSign className="w-5 h-5" />}
          accent={net >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Transactions"
          value={String(filtered.length)}
          sub="In current view"
          icon={<Receipt className="w-5 h-5" />}
          accent="blue"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All properties" />
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

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="_income_header" disabled>── Income ──</SelectItem>
            {INCOME_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
            <SelectItem value="_expense_header" disabled>── Expenses ──</SelectItem>
            {ACCOUNTING_EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          <Input
            type="date"
            className="w-36 h-9"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <span>–</span>
          <Input
            type="date"
            className="w-36 h-9"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={onAddClick}>
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Receipt /></EmptyMedia>
            <EmptyTitle>
              {transactions.length === 0 ? "No transactions yet" : "No transactions match filters"}
            </EmptyTitle>
            <EmptyDescription>
              {transactions.length === 0
                ? "Start recording income and expenses for your properties"
                : "Try adjusting your filters or date range"}
            </EmptyDescription>
          </EmptyHeader>
          {transactions.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={onAddClick} className="gap-2">
                <Plus className="w-4 h-4" /> Add Transaction
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <Card>
          <CardContent className="px-4 py-2">
            {withBalance.map(({ tx, balance }) => (
              <TransactionRow key={tx._id} tx={tx} runningBalance={balance} />
            ))}
            <div className="flex items-center justify-between pt-3 pb-1 mt-2 border-t border-border">
              <span className="text-xs text-muted-foreground font-medium">
                {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
              </span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                net >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                Net: {net >= 0 ? "+" : "-"}{formatCurrency(Math.abs(net))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── GST Report tab ────────────────────────────────────────────────────────────
function GSTReportTab() {
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = now.toISOString().split("T")[0]!;

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const report = useQuery(api.accounting.getGSTReport, { dateFrom, dateTo });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Input type="date" className="w-36 h-9" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-muted-foreground">–</span>
          <Input type="date" className="w-36 h-9" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground">
          Filter by date range for IRD filing periods (e.g. bi-monthly)
        </span>
      </div>

      {report === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !report ? null : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-emerald-500/20">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">GST Collected (Income)</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600">{formatCurrency(report.totalIncomeGST)}</p>
                <p className="text-xs text-muted-foreground mt-1">on {formatCurrency(report.totalIncomeNet)} net income</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/20">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">GST Paid (Expenses)</p>
                <p className="text-2xl font-bold tabular-nums text-red-600">{formatCurrency(report.totalExpenseGST)}</p>
                <p className="text-xs text-muted-foreground mt-1">on {formatCurrency(report.totalExpenseNet)} net expenses</p>
              </CardContent>
            </Card>
            <Card className={cn(
              report.netGSTPosition >= 0 ? "border-amber-500/20" : "border-blue-500/20"
            )}>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Net GST {report.netGSTPosition >= 0 ? "Payable to IRD" : "Refund from IRD"}
                </p>
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  report.netGSTPosition >= 0 ? "text-amber-600" : "text-blue-600"
                )}>
                  {formatCurrency(Math.abs(report.netGSTPosition))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {report.netGSTPosition >= 0
                    ? "Amount owing to IRD"
                    : "IRD owes you this amount"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction count */}
          <p className="text-xs text-muted-foreground">
            Based on {report.transactionCount} transaction{report.transactionCount !== 1 ? "s" : ""} from{" "}
            {formatDateLong(dateFrom)} to {formatDateLong(dateTo)}
          </p>

          {/* Income breakdown */}
          {report.incomeRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700">Income Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {report.incomeRows.map((row) => (
                    <div key={row.category} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                      <span className="text-muted-foreground">{getCategoryLabel(row.category)}</span>
                      <div className="flex items-center gap-6 tabular-nums text-right">
                        <span className="text-xs text-muted-foreground w-28">GST: {formatCurrency(row.gst)}</span>
                        <span className="text-xs text-muted-foreground w-28">Net: {formatCurrency(row.net)}</span>
                        <span className="font-medium w-28">Gross: {formatCurrency(row.gross)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expense breakdown */}
          {report.expenseRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-700">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {report.expenseRows.map((row) => (
                    <div key={row.category} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                      <span className="text-muted-foreground">{getCategoryLabel(row.category)}</span>
                      <div className="flex items-center gap-6 tabular-nums text-right">
                        <span className="text-xs text-muted-foreground w-28">GST: {formatCurrency(row.gst)}</span>
                        <span className="text-xs text-muted-foreground w-28">Net: {formatCurrency(row.net)}</span>
                        <span className="font-medium w-28">Gross: {formatCurrency(row.gross)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.incomeRows.length === 0 && report.expenseRows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No GST transactions in this period
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Owner Statement tab ───────────────────────────────────────────────────────
function OwnerStatementTab() {
  const properties = useQuery(api.properties.list, {});
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [propertyId, setPropertyId] = useState<string>("");
  const [yearMonth, setYearMonth] = useState(defaultMonth);

  const statement = useQuery(
    api.accounting.getOwnerStatement,
    propertyId ? { propertyId: propertyId as Id<"properties">, yearMonth } : "skip"
  );

  function handlePrint() { window.print(); }

  const monthLabel = yearMonth
    ? new Date(yearMonth + "-01").toLocaleDateString("en-NZ", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select property..." />
          </SelectTrigger>
          <SelectContent>
            {(properties ?? []).map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.country === "nz" ? "🇳🇿" : "🇦🇺"} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="month"
          className="w-40 h-9"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
        />
      </div>

      {!propertyId ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Select a property to generate an owner statement
        </div>
      ) : statement === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : !statement ? null : (
        <div className="max-w-2xl print:max-w-full">
          {/* Statement header */}
          <div className="flex items-start justify-between mb-6 print:mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Owner Statement</h2>
              </div>
              <p className="text-sm text-muted-foreground">{statement.property.name}</p>
              <p className="text-xs text-muted-foreground">{statement.property.address}</p>
              <p className="text-xs font-medium mt-1">{monthLabel}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-2 print:hidden"
            >
              <Receipt className="w-4 h-4" />
              Print / PDF
            </Button>
          </div>

          {/* Statement body */}
          <Card>
            <CardContent className="p-0">
              {/* Opening balance */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <span className="text-sm font-medium">Opening Balance</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(statement.openingBalance, statement.property.country as Country)}
                </span>
              </div>

              {/* Income items */}
              {statement.incomeItems.length > 0 && (
                <div className="border-b border-border">
                  <div className="px-5 py-2 bg-emerald-500/5">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Income</span>
                  </div>
                  {statement.incomeItems.map((t) => (
                    <div key={t._id} className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(t.category)} · {formatDateLong(t.date)}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-emerald-600 tabular-nums">
                        +{formatCurrency(t.netAmount, statement.property.country as Country)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-2 bg-emerald-500/5">
                    <span className="text-xs font-semibold text-emerald-700">Total Income</span>
                    <span className="text-sm font-bold text-emerald-600 tabular-nums">
                      +{formatCurrency(statement.totalIncome, statement.property.country as Country)}
                    </span>
                  </div>
                </div>
              )}

              {/* Expense items */}
              {statement.expenseItems.length > 0 && (
                <div className="border-b border-border">
                  <div className="px-5 py-2 bg-red-500/5">
                    <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Expenses</span>
                  </div>
                  {statement.expenseItems.map((t) => (
                    <div key={t._id} className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getCategoryLabel(t.category)} · {formatDateLong(t.date)}
                          {t.supplierId && ` · ${t.supplierId}`}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-red-600 tabular-nums">
                        -{formatCurrency(t.netAmount, statement.property.country as Country)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-2 bg-red-500/5">
                    <span className="text-xs font-semibold text-red-700">Total Expenses</span>
                    <span className="text-sm font-bold text-red-600 tabular-nums">
                      -{formatCurrency(statement.totalExpenses, statement.property.country as Country)}
                    </span>
                  </div>
                </div>
              )}

              {/* Net + closing */}
              <div className="px-5 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Net Amount to Owner</span>
                  <span className={cn(
                    "text-base font-bold tabular-nums",
                    statement.netAmount >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {statement.netAmount >= 0 ? "+" : ""}
                    {formatCurrency(statement.netAmount, statement.property.country as Country)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3 bg-muted/50">
                <span className="text-sm font-semibold">Closing Balance</span>
                <span className="text-base font-bold tabular-nums">
                  {formatCurrency(statement.closingBalance, statement.property.country as Country)}
                </span>
              </div>
            </CardContent>
          </Card>

          {statement.incomeItems.length === 0 && statement.expenseItems.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              No transactions recorded for this month
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────────
function AccountingInner() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Accounting
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            NZ property chart of accounts — income, expenses, GST & owner statements
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="mb-2">
          <TabsTrigger value="transactions" className="gap-2">
            <Receipt className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="gst" className="gap-2">
            <DollarSign className="w-4 h-4" />
            GST Report
          </TabsTrigger>
          <TabsTrigger value="statement" className="gap-2">
            <FileText className="w-4 h-4" />
            Owner Statement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionsTab onAddClick={() => setAddOpen(true)} />
        </TabsContent>

        <TabsContent value="gst">
          <GSTReportTab />
        </TabsContent>

        <TabsContent value="statement">
          <OwnerStatementTab />
        </TabsContent>
      </Tabs>

      <AddTransactionDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

export default function AccountingPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Sign in to view accounting</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <AccountingInner />
      </Authenticated>
    </>
  );
}
