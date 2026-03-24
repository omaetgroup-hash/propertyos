import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Building2,
  Users,
  DoorOpen,
  DollarSign,
  AlertTriangle,
  ClipboardCheck,
  TrendingUp,
  Home,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatCurrency } from "@/lib/locale.ts";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
};

function StatCard({ title, value, subtitle, icon, accent = "bg-primary/10 text-primary" }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", accent)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OccupancyBar({ rate }: { rate: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Occupancy Rate</span>
        <span className="font-semibold">{rate}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            rate >= 85
              ? "bg-emerald-500"
              : rate >= 70
                ? "bg-yellow-500"
                : "bg-destructive"
          )}
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {rate >= 85
          ? "Strong occupancy"
          : rate >= 70
            ? "Moderate occupancy — consider reviewing vacant units"
            : "Low occupancy — action required"}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const stats = useQuery(api.properties.getDashboardStats, {});

  if (stats === undefined) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Unable to load dashboard data.</p>
      </div>
    );
  }

  // Use NZD for mixed/NZ-majority portfolios, AUD if AU-only
  const portfolioCurrency = stats.auProperties > stats.nzProperties ? "au" : "nz";

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your property portfolio
          </p>
        </div>
        {/* Portfolio country split */}
        {stats.totalProperties > 0 && (
          <div className="flex gap-2">
            {stats.nzProperties > 0 && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                🇳🇿 {stats.nzProperties} NZ
              </Badge>
            )}
            {stats.auProperties > 0 && (
              <Badge variant="secondary" className="gap-1.5 text-xs">
                🇦🇺 {stats.auProperties} AU
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          subtitle="Active in portfolio"
          icon={<Building2 className="w-5 h-5" />}
          accent="bg-blue-500/10 text-blue-600"
        />
        <StatCard
          title="Total Units"
          value={stats.totalUnits}
          subtitle={`${stats.vacantUnits} vacant`}
          icon={<Home className="w-5 h-5" />}
          accent="bg-indigo-500/10 text-indigo-600"
        />
        <StatCard
          title="Active Tenancies"
          value={stats.activeLeases}
          subtitle="Current RTA agreements"
          icon={<Users className="w-5 h-5" />}
          accent="bg-violet-500/10 text-violet-600"
        />
        <StatCard
          title="Weekly Rent Roll"
          value={formatCurrency(stats.weeklyIncome, portfolioCurrency)}
          subtitle={`≈ ${formatCurrency(stats.monthlyRevenue, portfolioCurrency)}/mth`}
          icon={<DollarSign className="w-5 h-5" />}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          title="Vacant Units"
          value={stats.vacantUnits}
          subtitle="Available to let"
          icon={<DoorOpen className="w-5 h-5" />}
          accent="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          subtitle={
            stats.totalUnits > 0
              ? `${stats.occupiedUnits} of ${stats.totalUnits} units`
              : "No units yet"
          }
          icon={<TrendingUp className="w-5 h-5" />}
          accent="bg-teal-500/10 text-teal-600"
        />
        <StatCard
          title="Pending Inspections"
          value={stats.pendingInspections}
          subtitle="Scheduled"
          icon={<ClipboardCheck className="w-5 h-5" />}
          accent="bg-sky-500/10 text-sky-600"
        />
        <StatCard
          title="Compliance Issues"
          value={stats.overdueCompliance}
          subtitle="Overdue or expired"
          icon={<AlertTriangle className="w-5 h-5" />}
          accent={
            stats.overdueCompliance > 0
              ? "bg-red-500/10 text-red-600"
              : "bg-green-500/10 text-green-600"
          }
        />
      </div>

      {/* Occupancy bar */}
      {stats.totalUnits > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyBar rate={stats.occupancyRate} />
          </CardContent>
        </Card>
      )}

      {/* Empty state nudge */}
      {stats.totalProperties === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
            <div>
              <p className="font-semibold">No properties yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first NZ or AU property to get started
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-1">
              <Badge variant="outline" className="text-xs gap-1">🇳🇿 New Zealand</Badge>
              <Badge variant="outline" className="text-xs gap-1">🇦🇺 Australia</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
