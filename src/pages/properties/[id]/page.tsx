import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Building2,
  Home,
  MapPin,
  Plus,
  Trash2,
  Bed,
  Bath,
  Layers,
  DollarSign,
  Wrench,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { AU_STATES, NZ_REGIONS, formatCurrency, getCategoryLabel, type Country } from "@/lib/locale.ts";
import AddUnitDialog from "../_components/AddUnitDialog.tsx";
import AddTransactionDialog from "../../accounting/_components/AddTransactionDialog.tsx";

function getRegionLabel(country: "nz" | "au", regionCode: string): string {
  const list = country === "au" ? AU_STATES : NZ_REGIONS;
  return (list as ReadonlyArray<{ value: string; label: string }>).find(
    (r) => r.value === regionCode
  )?.label ?? regionCode;
}

function UnitStatusBadge({ status }: { status: Doc<"units">["status"] }) {
  const config = {
    vacant: { label: "Vacant", className: "bg-amber-500/10 text-amber-700" },
    occupied: { label: "Occupied", className: "bg-emerald-500/10 text-emerald-700" },
    maintenance: { label: "Maintenance", className: "bg-red-500/10 text-red-700" },
  };
  const { label, className } = config[status];
  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      {label}
    </Badge>
  );
}

function UnitCard({ unit, country }: { unit: Doc<"units">; country: Country }) {
  const deleteUnit = useMutation(api.units.remove);

  async function handleDelete() {
    try {
      await deleteUnit({ id: unit._id });
      toast.success("Unit removed");
    } catch {
      toast.error("Failed to remove unit");
    }
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Unit {unit.unitNumber}</span>
          {unit.floor !== undefined && (
            <span className="text-xs text-muted-foreground">Floor {unit.floor}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <UnitStatusBadge status={unit.status} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Unit {unit.unitNumber}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this unit. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {unit.bedrooms !== undefined && (
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" />
            {unit.bedrooms} bed
          </span>
        )}
        {unit.bathrooms !== undefined && (
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {unit.bathrooms} bath
          </span>
        )}
        {unit.squareMetres !== undefined && (
          <span>{unit.squareMetres} m²</span>
        )}
        {unit.weeklyRent !== undefined && (
          <span className="ml-auto flex items-center gap-1 font-semibold text-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            {formatCurrency(unit.weeklyRent, country)}/wk
          </span>
        )}
      </div>
    </div>
  );
}

// ── Accounting tab ────────────────────────────────────────────────────────────
function AccountingTab({
  propertyId,
  country,
}: {
  propertyId: Id<"properties">;
  country: Country;
}) {
  const [addTxOpen, setAddTxOpen] = useState(false);
  const stats = useQuery(api.accounting.getAccountingStats, { propertyId });

  if (stats === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No accounting data available.
      </p>
    );
  }

  const isEmpty = stats.monthlyData.every((d) => d.income === 0 && d.expenses === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Property P&L</h2>
        <Button size="sm" onClick={() => setAddTxOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* This month + YTD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-emerald-500/10 space-y-1">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">This Month Income</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700">
            {formatCurrency(stats.monthIncome, country)}
          </p>
          <p className="text-xs text-emerald-600/70">Net (ex-GST)</p>
        </div>
        <div className="rounded-xl p-4 bg-red-500/10 space-y-1">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">This Month Expenses</p>
          <p className="text-xl font-bold tabular-nums text-red-700">
            {formatCurrency(stats.monthExpenses, country)}
          </p>
          <p className="text-xs text-red-600/70">Net (ex-GST)</p>
        </div>
        <div className={cn(
          "rounded-xl p-4 space-y-1 col-span-2 sm:col-span-1",
          stats.monthNet >= 0 ? "bg-blue-500/10" : "bg-amber-500/10"
        )}>
          <p className={cn(
            "text-xs font-medium uppercase tracking-wide",
            stats.monthNet >= 0 ? "text-blue-700" : "text-amber-700"
          )}>
            This Month Net
          </p>
          <p className={cn(
            "text-xl font-bold tabular-nums",
            stats.monthNet >= 0 ? "text-blue-700" : "text-amber-700"
          )}>
            {stats.monthNet >= 0 ? "+" : ""}{formatCurrency(stats.monthNet, country)}
          </p>
          <p className={cn("text-xs opacity-70", stats.monthNet >= 0 ? "text-blue-600" : "text-amber-600")}>
            {stats.monthNet >= 0 ? "Surplus" : "Deficit"}
          </p>
        </div>

        <div className="rounded-xl p-4 bg-muted/50 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">YTD Income</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(stats.ytdIncome, country)}</p>
          <p className="text-xs text-muted-foreground">Year to date</p>
        </div>
        <div className="rounded-xl p-4 bg-muted/50 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">YTD Expenses</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(stats.ytdExpenses, country)}</p>
          <p className="text-xs text-muted-foreground">Year to date</p>
        </div>
        <div className={cn(
          "rounded-xl p-4 space-y-1 col-span-2 sm:col-span-1",
          stats.ytdNet >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"
        )}>
          <div className="flex items-center gap-1.5">
            {stats.ytdNet >= 0
              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            }
            <p className={cn(
              "text-xs font-medium uppercase tracking-wide",
              stats.ytdNet >= 0 ? "text-emerald-700" : "text-red-700"
            )}>
              YTD Net
            </p>
          </div>
          <p className={cn(
            "text-xl font-bold tabular-nums",
            stats.ytdNet >= 0 ? "text-emerald-700" : "text-red-700"
          )}>
            {stats.ytdNet >= 0 ? "+" : ""}{formatCurrency(stats.ytdNet, country)}
          </p>
          <p className={cn("text-xs opacity-70", stats.ytdNet >= 0 ? "text-emerald-600" : "text-red-600")}>
            {stats.ytdNet >= 0 ? "Profitable" : "Running at a loss"}
          </p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Net Position — Last 12 Months</CardTitle>
          <p className="text-xs text-muted-foreground">Monthly income vs expenses (net, ex-GST)</p>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              No accounting data yet. Add your first transaction above.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${Math.abs(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
                        <p className="font-semibold">{label}</p>
                        {payload.map((p) => (
                          <div key={p.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: p.color as string }} />
                            <span className="text-muted-foreground">{p.name}:</span>
                            <span className="font-medium">{formatCurrency(p.value as number, country)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top expense categories */}
      {stats.topCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Expense Categories (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCategories.map(([category, amount]) => {
                const total = stats.topCategories.reduce((s, [, v]) => s + v, 0);
                const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{getCategoryLabel(category)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                        <span className="font-medium tabular-nums">{formatCurrency(amount, country)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AddTransactionDialog
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        defaultPropertyId={propertyId}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const property = useQuery(
    api.properties.get,
    id ? { id: id as Id<"properties"> } : "skip"
  );
  const units = useQuery(
    api.units.listByProperty,
    id ? { propertyId: id as Id<"properties"> } : "skip"
  );

  if (property === undefined || units === undefined) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Property not found.</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/properties">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
        </Button>
      </div>
    );
  }

  const country = property.country as Country;
  const regionLabel = getRegionLabel(property.country, property.region);
  const addressLine = [property.address, property.suburb, property.city, regionLabel, property.postCode]
    .filter(Boolean)
    .join(", ");

  const occupiedCount = units.filter((u) => u.status === "occupied").length;
  const vacantCount = units.filter((u) => u.status === "vacant").length;
  const maintenanceCount = units.filter((u) => u.status === "maintenance").length;
  const weeklyTotal = units
    .filter((u) => u.status === "occupied" && u.weeklyRent)
    .reduce((sum, u) => sum + (u.weeklyRent ?? 0), 0);

  return (
    <div className="p-8 space-y-6">
      {/* Back + Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/properties">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Properties
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1.5 capitalize",
                  property.type === "residential"
                    ? "bg-violet-500/10 text-violet-700"
                    : "bg-blue-500/10 text-blue-700"
                )}
              >
                {property.type === "residential"
                  ? <Home className="w-3.5 h-3.5" />
                  : <Building2 className="w-3.5 h-3.5" />
                }
                {property.type}
              </Badge>
              <span className="text-base">{property.country === "nz" ? "🇳🇿" : "🇦🇺"}</span>
              <Badge
                variant="secondary"
                className={cn(
                  property.status === "active"
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {property.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{property.name}</h1>
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              {addressLine}
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{occupiedCount}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{vacantCount}</p>
                <p className="text-xs text-muted-foreground">Vacant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{maintenanceCount}</p>
                <p className="text-xs text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(weeklyTotal, country)}</p>
                <p className="text-xs text-muted-foreground">Weekly rent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Overview + Accounting */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounting" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Accounting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                {property.yearBuilt && (
                  <>
                    <dt className="text-muted-foreground">Year Built</dt>
                    <dd className="font-medium col-span-1">{property.yearBuilt}</dd>
                  </>
                )}
                {property.squareMetres && (
                  <>
                    <dt className="text-muted-foreground">Floor Area</dt>
                    <dd className="font-medium">{property.squareMetres} m²</dd>
                  </>
                )}
                {property.councilRef && (
                  <>
                    <dt className="text-muted-foreground">Council Ref</dt>
                    <dd className="font-medium font-mono">{property.councilRef}</dd>
                  </>
                )}
                {property.titleNumber && (
                  <>
                    <dt className="text-muted-foreground">Title No.</dt>
                    <dd className="font-medium font-mono">{property.titleNumber}</dd>
                  </>
                )}
                {property.description && (
                  <div className="col-span-full">
                    <dt className="text-muted-foreground mb-1">Notes</dt>
                    <dd className="text-sm text-foreground/80">{property.description}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Units */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Units</h2>
                <p className="text-xs text-muted-foreground">
                  {units.length} of {property.totalUnits} units added
                </p>
              </div>
              <Button size="sm" onClick={() => setAddUnitOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Unit
              </Button>
            </div>

            {units.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-3">
                <Layers className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-sm">No units added yet</p>
                  <p className="text-xs text-muted-foreground">
                    Add units to track occupancy, rent and tenant assignments
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setAddUnitOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add First Unit
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {units.map((unit) => (
                  <UnitCard key={unit._id} unit={unit} country={country} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accounting" className="mt-4">
          {id && (
            <AccountingTab
              propertyId={id as Id<"properties">}
              country={country}
            />
          )}
        </TabsContent>
      </Tabs>

      {id && (
        <AddUnitDialog
          open={addUnitOpen}
          onClose={() => setAddUnitOpen(false)}
          propertyId={id as Id<"properties">}
        />
      )}
    </div>
  );
}
