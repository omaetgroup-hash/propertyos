import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { formatCurrency, formatDateLong, EXPENSE_CATEGORIES } from "@/lib/locale.ts";
import {
  Printer,
  Mail,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  FileText,
  Wrench,
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  BarChart3,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

// ── Stat tile ─────────────────────────────────────────────────────────────────
type StatTileProps = {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "green" | "red" | "amber" | "blue";
  icon?: React.ReactNode;
};

function StatTile({ label, value, sub, accent = "default", icon }: StatTileProps) {
  const colors = {
    default: "bg-muted/50 text-foreground",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  return (
    <div className={cn("rounded-xl p-4 flex flex-col gap-1", colors[accent])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
type SectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant: "default" | "destructive" | "secondary" | "outline" };
};

function SectionHeader({ icon, title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <Badge variant={badge.variant} className="shrink-0 mt-0.5 text-xs">
          {badge.label}
        </Badge>
      )}
    </div>
  );
}

// ── Main report inner ─────────────────────────────────────────────────────────
function ReportInner() {
  const report = useQuery(api.reports.getReportData, {});

  if (report === undefined) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!report) return null;

  const {
    generatedAt,
    financial,
    occupancy,
    tenants,
    maintenance,
    compliance,
    inspections,
  } = report;

  const generatedDate = new Date(generatedAt);
  const generatedLabel = generatedDate.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Email handler ────────────────────────────────────────────────────────────
  const handleEmail = () => {
    const subject = encodeURIComponent(`PropertyOS Portfolio Report — ${formatDateLong(generatedAt.split("T")[0] ?? "")}`);
    const body = encodeURIComponent(
      [
        `PropertyOS Portfolio Report`,
        `Generated: ${generatedLabel}`,
        ``,
        `FINANCIAL SUMMARY`,
        `Annual Income:   ${formatCurrency(financial.annualIncome)}`,
        `Total Expenses:  ${formatCurrency(financial.totalExpenses)}`,
        `Net Profit:      ${formatCurrency(financial.netProfit)}`,
        `Weekly Rent Roll:${formatCurrency(financial.weeklyRentRoll)}/wk`,
        `Monthly Rent:    ${formatCurrency(financial.monthlyRentRoll)}/mo`,
        ``,
        `OCCUPANCY`,
        `Properties: ${occupancy.totalProperties}`,
        `Occupied Units: ${occupancy.occupiedUnits} / ${occupancy.totalUnits} (${occupancy.occupancyRate}%)`,
        `Vacant Units: ${occupancy.vacantUnits}`,
        ``,
        `TENANTS & LEASES`,
        `Total Tenants: ${tenants.totalTenants}`,
        `Active Leases: ${tenants.activeLeaseCount}`,
        `Expiring (30 days): ${tenants.expiringIn30}`,
        `Expiring (31–60 days): ${tenants.expiringIn60}`,
        ``,
        `MAINTENANCE`,
        `Open Requests: ${maintenance.open}`,
        `Completed: ${maintenance.completed}`,
        `High Priority: ${maintenance.highPriority}`,
        ``,
        `COMPLIANCE`,
        `Compliant Items: ${compliance.compliant} / ${compliance.total}`,
        `Upcoming (30 days): ${compliance.upcomingIn30Days}`,
        `Overdue / Expired: ${compliance.overdue}`,
        ``,
        `INSPECTIONS`,
        `Total: ${inspections.total}`,
        `Scheduled: ${inspections.scheduled}`,
        `Completed: ${inspections.completed}`,
        `Overdue: ${inspections.overdue}`,
      ].join("\n")
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const isNetPositive = financial.netProfit >= 0;
  const netAccent = isNetPositive ? "green" : "red";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 print:px-0 print:py-0">

      {/* ── Report header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8 print:mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Portfolio Report</h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Generated {generatedLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={handleEmail} className="gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Button>
          <Button size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── 1. Financial Summary ──────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl border border-border p-6 print:border-border print:rounded-none print:border-b print:p-4">
          <SectionHeader
            icon={<DollarSign className="w-4 h-4" />}
            title="Financial Summary"
            subtitle="Annual income, expenses & net profit"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <StatTile
              label="Annual Income"
              value={formatCurrency(financial.annualIncome)}
              sub="From active leases"
              accent="green"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatTile
              label="Total Expenses"
              value={formatCurrency(financial.totalExpenses)}
              sub="All recorded expenses"
              accent="red"
              icon={<TrendingDown className="w-4 h-4" />}
            />
            <StatTile
              label="Net Profit"
              value={formatCurrency(financial.netProfit)}
              sub={isNetPositive ? "Profitable" : "Running at a loss"}
              accent={netAccent}
              icon={isNetPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            />
          </div>

          {/* ── 2. Rent Performance ────────────────────────────────────────────── */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Rent Performance</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile
                label="Weekly Rent Roll"
                value={formatCurrency(financial.weeklyRentRoll)}
                sub="Active + periodic leases"
                accent="blue"
                icon={<Calendar className="w-4 h-4" />}
              />
              <StatTile
                label="Monthly Rent"
                value={formatCurrency(financial.monthlyRentRoll)}
                sub="52-week equivalent"
                accent="blue"
                icon={<Calendar className="w-4 h-4" />}
              />
              <StatTile
                label="Vacant Income Loss"
                value={formatCurrency(0)}
                sub={`${occupancy.vacantUnits} vacant units`}
                accent="amber"
                icon={<Home className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Expense breakdown */}
          {Object.keys(financial.expenseByCategory).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Expense Breakdown</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(financial.expenseByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const label =
                      EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
                    const pct =
                      financial.totalExpenses > 0
                        ? Math.round((amount / financial.totalExpenses) * 100)
                        : 0;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground truncate">{label}</span>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(amount)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>

        {/* ── 3. Occupancy Report ───────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl border border-border p-6 print:border-border print:rounded-none print:border-b print:p-4">
          <SectionHeader
            icon={<Building2 className="w-4 h-4" />}
            title="Occupancy Report"
            subtitle="Properties, units & vacancy overview"
            badge={
              occupancy.occupancyRate >= 90
                ? { label: `${occupancy.occupancyRate}% Full`, variant: "default" }
                : occupancy.occupancyRate >= 70
                ? { label: `${occupancy.occupancyRate}% Occupied`, variant: "secondary" }
                : { label: `${occupancy.occupancyRate}% Occupied`, variant: "destructive" }
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Properties"
              value={occupancy.totalProperties}
              sub="Total in portfolio"
              accent="blue"
              icon={<Building2 className="w-4 h-4" />}
            />
            <StatTile
              label="Occupied"
              value={occupancy.occupiedUnits}
              sub={`of ${occupancy.totalUnits} units`}
              accent="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatTile
              label="Vacant"
              value={occupancy.vacantUnits}
              sub="Available to let"
              accent={occupancy.vacantUnits > 0 ? "amber" : "default"}
              icon={<Home className="w-4 h-4" />}
            />
            <StatTile
              label="Maintenance"
              value={occupancy.maintenanceUnits}
              sub="Units offline"
              accent={occupancy.maintenanceUnits > 0 ? "red" : "default"}
              icon={<Wrench className="w-4 h-4" />}
            />
          </div>

          {/* Occupancy bar */}
          {occupancy.totalUnits > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Occupancy rate</span>
                <span className="text-xs font-semibold">{occupancy.occupancyRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(occupancy.occupiedUnits / occupancy.totalUnits) * 100}%` }}
                />
                {occupancy.maintenanceUnits > 0 && (
                  <div
                    className="h-full bg-red-400"
                    style={{ width: `${(occupancy.maintenanceUnits / occupancy.totalUnits) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Occupied
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  Vacant
                </div>
                {occupancy.maintenanceUnits > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    Maintenance
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── 4. Tenant Report ──────────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl border border-border p-6 print:border-border print:rounded-none print:border-b print:p-4">
          <SectionHeader
            icon={<Users className="w-4 h-4" />}
            title="Tenant Report"
            subtitle="Active tenants, leases & upcoming renewals"
            badge={
              tenants.expiringIn30 > 0
                ? { label: `${tenants.expiringIn30} expiring soon`, variant: "destructive" }
                : undefined
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <StatTile
              label="Total Tenants"
              value={tenants.totalTenants}
              sub={`${tenants.activeTenants} active`}
              accent="blue"
              icon={<Users className="w-4 h-4" />}
            />
            <StatTile
              label="Active Leases"
              value={tenants.activeLeaseCount}
              sub={`${tenants.periodicLeases} periodic`}
              accent="green"
              icon={<FileText className="w-4 h-4" />}
            />
            <StatTile
              label="Expiring (30 days)"
              value={tenants.expiringIn30}
              sub="Require renewal action"
              accent={tenants.expiringIn30 > 0 ? "red" : "default"}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
          {tenants.expiringIn60 > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg px-4 py-3">
              <Calendar className="w-4 h-4 shrink-0" />
              <p className="text-sm">
                <strong>{tenants.expiringIn60}</strong> additional{" "}
                {tenants.expiringIn60 === 1 ? "lease expires" : "leases expire"} in the 31–60 day window.
              </p>
            </div>
          )}
        </section>

        {/* ── 5. Maintenance Report ─────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl border border-border p-6 print:border-border print:rounded-none print:border-b print:p-4">
          <SectionHeader
            icon={<Wrench className="w-4 h-4" />}
            title="Maintenance Report"
            subtitle="Open, in-progress & completed maintenance inspections"
            badge={
              maintenance.highPriority > 0
                ? { label: `${maintenance.highPriority} high priority`, variant: "destructive" }
                : undefined
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Total Requests"
              value={maintenance.total}
              sub="All maintenance work"
              accent="default"
              icon={<Wrench className="w-4 h-4" />}
            />
            <StatTile
              label="Open"
              value={maintenance.open}
              sub="Scheduled / pending"
              accent={maintenance.open > 0 ? "amber" : "default"}
              icon={<Clock className="w-4 h-4" />}
            />
            <StatTile
              label="In Progress"
              value={maintenance.inProgress}
              sub="Currently active"
              accent={maintenance.inProgress > 0 ? "blue" : "default"}
              icon={<Wrench className="w-4 h-4" />}
            />
            <StatTile
              label="Completed"
              value={maintenance.completed}
              sub="Resolved"
              accent="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
          </div>
          {maintenance.highPriority > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="text-sm">
                <strong>{maintenance.highPriority}</strong> high-priority{" "}
                {maintenance.highPriority === 1 ? "issue" : "issues"} with poor condition rating
                {maintenance.highPriority === 1 ? " requires" : " require"} urgent attention.
              </p>
            </div>
          )}
        </section>

        {/* ── 6. Compliance Report ──────────────────────────────────────────────── */}
        <section className="bg-card rounded-2xl border border-border p-6 print:border-border print:rounded-none print:border-b print:p-4">
          <SectionHeader
            icon={<ShieldCheck className="w-4 h-4" />}
            title="Compliance Report"
            subtitle="Regulatory compliance status across all properties"
            badge={
              compliance.overdue > 0
                ? { label: `${compliance.overdue} overdue`, variant: "destructive" }
                : compliance.total > 0 && compliance.compliant === compliance.total
                ? { label: "All compliant", variant: "default" }
                : undefined
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatTile
              label="Compliant"
              value={`${compliance.compliant} / ${compliance.total}`}
              sub="Items in order"
              accent="green"
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <StatTile
              label="Due in 30 days"
              value={compliance.upcomingIn30Days}
              sub="Action required"
              accent={compliance.upcomingIn30Days > 0 ? "amber" : "default"}
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatTile
              label="Due in 31–60 days"
              value={compliance.upcomingIn60Days}
              sub="Plan ahead"
              accent={compliance.upcomingIn60Days > 0 ? "blue" : "default"}
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatTile
              label="Overdue / Expired"
              value={compliance.overdue}
              sub="Immediate action needed"
              accent={compliance.overdue > 0 ? "red" : "default"}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>

          {/* Inspections sub-section */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Inspection Status</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile
                label="Total Inspections"
                value={inspections.total}
                accent="default"
                icon={<ClipboardCheck className="w-4 h-4" />}
              />
              <StatTile
                label="Scheduled"
                value={inspections.scheduled}
                sub="Upcoming"
                accent="blue"
                icon={<Calendar className="w-4 h-4" />}
              />
              <StatTile
                label="Completed"
                value={inspections.completed}
                accent="green"
                icon={<CheckCircle2 className="w-4 h-4" />}
              />
              <StatTile
                label="Overdue"
                value={inspections.overdue}
                sub="Missed schedule"
                accent={inspections.overdue > 0 ? "red" : "default"}
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </div>
          </div>
        </section>

      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-border text-center print:mt-4">
        <p className="text-xs text-muted-foreground">
          PropertyOS Portfolio Report &middot; Generated {generatedLabel} &middot; Confidential
        </p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <>
      <AuthLoading>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Sign in to view reports</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ReportInner />
      </Authenticated>
    </>
  );
}
