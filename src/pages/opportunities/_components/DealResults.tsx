import { cn } from "@/lib/utils.ts";
import {
  calculateDeal,
  formatCurrency,
  formatPercent,
  type DealInputs,
  type Viability,
} from "@/lib/deal-calculator.ts";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface DealResultsProps {
  inputs: DealInputs;
  compact?: boolean;
}

const viabilityConfig: Record<
  Viability,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  profitable: {
    label: "Profitable",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  borderline: {
    label: "Borderline",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: <Minus className="w-4 h-4" />,
  },
  not_viable: {
    label: "Not Viable",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon: <TrendingDown className="w-4 h-4" />,
  },
};

export default function DealResults({ inputs, compact = false }: DealResultsProps) {
  const metrics = calculateDeal(inputs);
  const viability = viabilityConfig[metrics.viability];
  const isProfit = metrics.weeklyProfit >= 0;

  return (
    <div className="space-y-4">
      {/* Decision Indicator */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg border font-semibold text-sm",
          viability.bg,
          viability.border,
          viability.color
        )}
      >
        {viability.icon}
        <span>Decision: {viability.label}</span>
        <span className="ml-auto text-xs font-normal opacity-70">
          {metrics.profitMargin.toFixed(1)}% margin
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3")}>
        <MetricCard
          label="Total Beds"
          value={String(metrics.totalBeds)}
          sub="Rooms × Beds/Room"
        />
        <MetricCard
          label="Weekly Revenue"
          value={formatCurrency(metrics.weeklyRevenue)}
          sub={`${formatCurrency(metrics.monthlyRevenue)}/mo`}
          highlight
        />
        <MetricCard
          label="Weekly Expenses"
          value={formatCurrency(metrics.weeklyExpenses)}
          sub={`${formatCurrency(metrics.monthlyExpenses)}/mo`}
        />
        <MetricCard
          label="Net Profit (Weekly)"
          value={formatCurrency(metrics.weeklyProfit)}
          sub={`${formatCurrency(metrics.monthlyProfit)}/mo`}
          positive={isProfit}
          negative={!isProfit}
          highlight
        />
        <MetricCard
          label="Profit Margin"
          value={formatPercent(metrics.profitMargin)}
          sub="Revenue after expenses"
          positive={metrics.profitMargin >= 20}
          negative={metrics.profitMargin < 0}
        />
        <MetricCard
          label="Break-even Occupancy"
          value={formatPercent(metrics.breakEvenOccupancy)}
          sub="Min occupancy to cover costs"
          positive={metrics.breakEvenOccupancy <= inputs.occupancyRate}
          negative={metrics.breakEvenOccupancy > 100}
        />
      </div>

      {/* Capacity note */}
      {metrics.totalBeds === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Enter room and bed counts to see revenue calculations.</span>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}

function MetricCard({ label, value, sub, highlight, positive, negative }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-0.5",
        highlight ? "bg-card" : "bg-muted/30"
      )}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-bold leading-tight",
          positive && "text-emerald-600 dark:text-emerald-400",
          negative && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
