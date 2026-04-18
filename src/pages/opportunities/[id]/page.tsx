import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
  ArrowLeft,
  MapPin,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Bed,
  Home,
  Building2,
  Layers,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import {
  calculateDeal,
  formatCurrency,
  formatPercent,
  type DealInputs,
} from "@/lib/deal-calculator.ts";

type PropertyType = "accommodation" | "residential" | "commercial" | "mixed_use";
type OppStatus = "evaluating" | "approved" | "rejected" | "converted";

const statusConfig: Record<OppStatus, { label: string; color: string; bg: string; border: string }> = {
  evaluating: {
    label: "Evaluating",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-700",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-700",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-700",
  },
  converted: {
    label: "Converted",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-700",
  },
};

const viabilityConfig = {
  profitable: {
    label: "Profitable",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: TrendingUp,
  },
  borderline: {
    label: "Borderline",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: Minus,
  },
  not_viable: {
    label: "Not Viable",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: TrendingDown,
  },
};

const propertyTypeOptions: { value: PropertyType; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: "accommodation", label: "Accommodation", sub: "Boarding house, hostel, rooms", icon: <Bed className="w-5 h-5" /> },
  { value: "residential", label: "Residential", sub: "Houses, units, apartments", icon: <Home className="w-5 h-5" /> },
  { value: "commercial", label: "Commercial", sub: "Retail, office, industrial", icon: <Building2 className="w-5 h-5" /> },
  { value: "mixed_use", label: "Mixed Use", sub: "Combination of types", icon: <Layers className="w-5 h-5" /> },
];

const PROPERTY_STRUCTURES: Record<PropertyType, string[]> = {
  accommodation: ["Boarding House", "Hostel", "Backpackers", "Serviced Rooms", "Student Accommodation"],
  residential: ["Standalone House", "Townhouse", "Apartment", "Unit", "Granny Flat"],
  commercial: ["Retail Shop", "Office Space", "Industrial Unit", "Warehouse", "Mixed Commercial"],
  mixed_use: ["Mixed Use Building", "Live/Work Space", "Commercial + Residential"],
};

const SCENARIO_OCCUPANCIES = [50, 60, 70, 80, 90, 95, 100];

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const opportunity = useQuery(api.opportunities.get, { id: id as Id<"opportunities"> });
  const updateOpportunity = useMutation(api.opportunities.update);
  const removeOpportunity = useMutation(api.opportunities.remove);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OppStatus>("evaluating");
  const [propertyType, setPropertyType] = useState<PropertyType | undefined>(undefined);
  const [propertyStructure, setPropertyStructure] = useState("");
  const [floorArea, setFloorArea] = useState<string>("");
  const [landArea, setLandArea] = useState<string>("");
  const [yearBuilt, setYearBuilt] = useState<string>("");
  const [inputs, setInputs] = useState<DealInputs>({
    numberOfRooms: 0,
    bedsPerRoom: 1,
    pricingType: "weekly",
    pricePerUnit: 0,
    occupancyRate: 80,
    leaseCost: 0,
    power: 0,
    water: 0,
    internet: 0,
    cleaning: 0,
    maintenance: 0,
    otherExpenses: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opportunity) return;
    setName(opportunity.name);
    setLocation(opportunity.location);
    setNotes(opportunity.notes ?? "");
    setStatus(opportunity.status);
    setPropertyType(opportunity.propertyType ?? undefined);
    setPropertyStructure(opportunity.propertyStructure ?? "");
    setFloorArea(opportunity.floorArea != null ? String(opportunity.floorArea) : "");
    setLandArea(opportunity.landArea != null ? String(opportunity.landArea) : "");
    setYearBuilt(opportunity.yearBuilt != null ? String(opportunity.yearBuilt) : "");
    setInputs({
      numberOfRooms: opportunity.numberOfRooms,
      bedsPerRoom: opportunity.bedsPerRoom,
      pricingType: opportunity.pricingType,
      pricePerUnit: opportunity.pricePerUnit,
      occupancyRate: opportunity.occupancyRate,
      leaseCost: opportunity.leaseCost,
      power: opportunity.power,
      water: opportunity.water,
      internet: opportunity.internet,
      cleaning: opportunity.cleaning,
      maintenance: opportunity.maintenance,
      otherExpenses: opportunity.otherExpenses,
    });
  }, [opportunity]);

  const setNum = (key: keyof DealInputs, raw: string) => {
    const val = parseFloat(raw);
    setInputs((prev) => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  };

  const handleSave = async () => {
    if (!name.trim() || !location.trim()) {
      toast.error("Name and location are required.");
      return;
    }
    setSaving(true);
    try {
      await updateOpportunity({
        id: id as Id<"opportunities">,
        name: name.trim(),
        location: location.trim(),
        notes: notes.trim() || undefined,
        status,
        propertyType: propertyType ?? undefined,
        propertyStructure: propertyStructure.trim() || undefined,
        floorArea: floorArea ? parseFloat(floorArea) : undefined,
        landArea: landArea ? parseFloat(landArea) : undefined,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
        ...inputs,
      });
      toast.success("Opportunity saved.");
    } catch {
      toast.error("Failed to save opportunity.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (val: OppStatus) => {
    setStatus(val);
    try {
      await updateOpportunity({ id: id as Id<"opportunities">, status: val });
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async () => {
    try {
      await removeOpportunity({ id: id as Id<"opportunities"> });
      toast.success("Opportunity deleted.");
      navigate("/opportunities");
    } catch {
      toast.error("Failed to delete opportunity.");
    }
  };

  // Loading
  if (opportunity === undefined) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-9 w-28 rounded" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <Skeleton className="flex-1 m-6 rounded-lg" />
          <Skeleton className="w-72 m-6 ml-0 rounded-lg" />
        </div>
      </div>
    );
  }

  if (opportunity === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Button variant="outline" asChild>
          <Link to="/opportunities"><ArrowLeft className="w-4 h-4 mr-2" />Back</Link>
        </Button>
      </div>
    );
  }

  const metrics = calculateDeal(inputs);
  const viability = viabilityConfig[metrics.viability];
  const ViabilityIcon = viability.icon;
  const sc = statusConfig[status];

  // Expense groupings for Live Analysis (annual)
  const annualExpenses = {
    Staff: inputs.cleaning * 52,
    Property: inputs.leaseCost * 52,
    Operating: (inputs.power + inputs.water + inputs.internet) * 52,
    Maintenance: inputs.maintenance * 52,
    Business: inputs.otherExpenses * 52,
  };

  const scenarioRows = SCENARIO_OCCUPANCIES.map((occ) => ({
    occupancy: occ,
    ...calculateDeal({ ...inputs, occupancyRate: occ }),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-1">
          <Link to="/opportunities"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight truncate">{opportunity.name}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{opportunity.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Status dropdown */}
          <Select value={status} onValueChange={(v) => void handleStatusChange(v as OppStatus)}>
            <SelectTrigger
              className={cn(
                "h-9 gap-1.5 text-sm font-semibold border",
                sc.bg, sc.color, sc.border
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(statusConfig) as [OppStatus, typeof statusConfig[OppStatus]][]).map(([val, cfg]) => (
                <SelectItem key={val} value={val}>
                  <span className={cfg.color}>{cfg.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-9 w-9">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete opportunity?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{opportunity.name}". This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleDelete()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="setup" className="h-full flex flex-col">
            <div className="px-6 border-b sticky top-0 bg-background z-10">
              <TabsList className="h-auto bg-transparent p-0 gap-0">
                {[
                  { value: "setup", label: "Property Setup" },
                  { value: "revenue", label: "Revenue" },
                  { value: "expenses", label: "Expenses" },
                  { value: "scenarios", label: "Scenarios" },
                  { value: "report", label: "Report" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Property Setup ── */}
            <TabsContent value="setup" className="flex-1 p-6 space-y-6 mt-0">
              {/* Property Type */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Property Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {propertyTypeOptions.map((opt) => {
                    const selected = propertyType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPropertyType(opt.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary/50",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-card hover:bg-muted/30"
                        )}
                      >
                        <span className={cn("mt-0.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}>
                          {opt.icon}
                        </span>
                        <div>
                          <p className={cn("text-sm font-semibold", selected ? "text-primary" : "")}>{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Property Structure */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Property Structure</h3>
                <div className="max-w-xs">
                  <Select value={propertyStructure} onValueChange={setPropertyStructure}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select structure…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(propertyType
                        ? PROPERTY_STRUCTURES[propertyType]
                        : Object.values(PROPERTY_STRUCTURES).flat()
                      ).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Physical Details */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Physical Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Floor Area (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 740"
                      value={floorArea}
                      onChange={(e) => setFloorArea(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Land Area (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 589"
                      value={landArea}
                      onChange={(e) => setLandArea(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-w-xs space-y-2">
                  <Label>Year Built</Label>
                  <Input
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    placeholder="e.g. 1980"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                  />
                </div>
              </section>

              {/* Notes */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Notes</h3>
                <Textarea
                  placeholder="Any notes about this deal…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none h-24"
                />
              </section>
            </TabsContent>

            {/* ── Revenue ── */}
            <TabsContent value="revenue" className="flex-1 p-6 space-y-6 mt-0">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Capacity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Rooms</Label>
                    <Input
                      type="number"
                      min="0"
                      value={inputs.numberOfRooms || ""}
                      onChange={(e) => setNum("numberOfRooms", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beds per Room</Label>
                    <Input
                      type="number"
                      min="1"
                      value={inputs.bedsPerRoom || ""}
                      onChange={(e) => setNum("bedsPerRoom", e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-2 flex items-end pb-1">
                    <p className="text-sm text-muted-foreground">
                      = <span className="text-foreground font-semibold">{metrics.totalBeds} total beds</span>
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Revenue Model</h3>
                <div className="max-w-xs space-y-2">
                  <Label>Pricing Type</Label>
                  <Select
                    value={inputs.pricingType}
                    onValueChange={(v) => setInputs((p) => ({ ...p, pricingType: v as "nightly" | "weekly" }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly (per bed)</SelectItem>
                      <SelectItem value="nightly">Nightly (per bed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Price / bed / {inputs.pricingType === "nightly" ? "night" : "week"} ($)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={inputs.pricePerUnit || ""}
                      onChange={(e) => setNum("pricePerUnit", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Occupancy (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={inputs.occupancyRate || ""}
                      onChange={(e) => setNum("occupancyRate", e.target.value)}
                      placeholder="80"
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">Revenue Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard label="Total Beds" value={String(metrics.totalBeds)} />
                  <StatCard label="Weekly Revenue" value={formatCurrency(metrics.weeklyRevenue)} highlight />
                  <StatCard label="Monthly Revenue" value={formatCurrency(metrics.monthlyRevenue)} highlight />
                  <StatCard label="Annual Revenue" value={formatCurrency(metrics.weeklyRevenue * 52)} highlight />
                  <StatCard
                    label="Break-even Occupancy"
                    value={formatPercent(metrics.breakEvenOccupancy)}
                    positive={metrics.breakEvenOccupancy <= inputs.occupancyRate}
                    negative={metrics.breakEvenOccupancy > inputs.occupancyRate}
                  />
                </div>
              </section>
            </TabsContent>

            {/* ── Expenses ── */}
            <TabsContent value="expenses" className="flex-1 p-6 space-y-6 mt-0">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Weekly Expenses ($)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(
                    [
                      ["leaseCost", "Lease Cost"],
                      ["power", "Power"],
                      ["water", "Water"],
                      ["internet", "Internet"],
                      ["cleaning", "Cleaning / Staff"],
                      ["maintenance", "Maintenance"],
                      ["otherExpenses", "Other / Business"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inputs[key] || ""}
                        onChange={(e) => setNum(key, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-xs text-muted-foreground uppercase tracking-wider">Annual Expense Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(annualExpenses).map(([label, amount]) => {
                    const totalAnnual = metrics.weeklyExpenses * 52;
                    const pct = totalAnnual > 0 ? (amount / totalAnnual) * 100 : 0;
                    return (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-muted-foreground shrink-0">{label}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right font-medium">{formatCurrency(amount)}</span>
                        <span className="w-10 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 text-sm font-semibold border-t pt-2">
                    <span className="w-24 shrink-0">Total</span>
                    <div className="flex-1" />
                    <span className="w-24 text-right">{formatCurrency(metrics.weeklyExpenses * 52)}</span>
                    <span className="w-10" />
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ── Scenarios ── */}
            <TabsContent value="scenarios" className="flex-1 p-6 space-y-6 mt-0">
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Occupancy Scenarios</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Performance at different occupancy rates using your current pricing and expenses.
                  </p>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Occupancy</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Weekly Rev</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Weekly Profit</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Monthly Profit</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Margin</th>
                        <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Viability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioRows.map((row) => {
                        const isTarget = row.occupancy === inputs.occupancyRate;
                        const v = viabilityConfig[row.viability];
                        const VIcon = v.icon;
                        return (
                          <tr
                            key={row.occupancy}
                            className={cn(
                              "border-b last:border-0 transition-colors",
                              isTarget ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-1.5">
                                {row.occupancy}%
                                {isTarget && (
                                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">
                                    target
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">{formatCurrency(row.weeklyRevenue)}</td>
                            <td className={cn("px-4 py-2.5 text-right", row.weeklyProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                              {formatCurrency(row.weeklyProfit)}
                            </td>
                            <td className={cn("px-4 py-2.5 text-right", row.monthlyProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                              {formatCurrency(row.monthlyProfit)}
                            </td>
                            <td className="px-4 py-2.5 text-right">{formatPercent(row.profitMargin)}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("flex items-center justify-center gap-1 text-xs font-medium", v.color)}>
                                <VIcon className="w-3.5 h-3.5" />
                                {v.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Pricing Sensitivity</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monthly profit at {inputs.occupancyRate}% occupancy across different price points.
                  </p>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                          Price / bed / {inputs.pricingType === "nightly" ? "night" : "week"}
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Weekly Rev</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Monthly Profit</th>
                        <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Viability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[-30, -20, -10, 0, 10, 20, 30].map((delta) => {
                        const price = Math.max(0, inputs.pricePerUnit + delta);
                        const m = calculateDeal({ ...inputs, pricePerUnit: price });
                        const isTarget = delta === 0;
                        const v = viabilityConfig[m.viability];
                        const VIcon = v.icon;
                        return (
                          <tr
                            key={delta}
                            className={cn(
                              "border-b last:border-0",
                              isTarget ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-1.5">
                                {formatCurrency(price)}
                                {isTarget && (
                                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">
                                    current
                                  </span>
                                )}
                                {delta !== 0 && (
                                  <span className={cn("text-[10px]", delta > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">{formatCurrency(m.weeklyRevenue)}</td>
                            <td className={cn("px-4 py-2.5 text-right", m.monthlyProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                              {formatCurrency(m.monthlyProfit)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("flex items-center justify-center gap-1 text-xs font-medium", v.color)}>
                                <VIcon className="w-3.5 h-3.5" />
                                {v.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </TabsContent>

            {/* ── Report ── */}
            <TabsContent value="report" className="flex-1 p-6 space-y-6 mt-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Deal Summary Report</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("en-NZ", { dateStyle: "long" })}
                </span>
              </div>
              <Card>
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3.5 h-3.5" />{location}
                      </div>
                      {propertyStructure && (
                        <p className="text-xs text-muted-foreground mt-0.5">{propertyStructure}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-semibold px-2 py-1 rounded border", sc.bg, sc.color, sc.border)}>
                        {sc.label}
                      </span>
                      <span className={cn("flex items-center gap-1 text-xs font-semibold", viability.color)}>
                        <ViabilityIcon className="w-3.5 h-3.5" />{viability.label}
                      </span>
                    </div>
                  </div>
                  {notes && <p className="text-sm text-muted-foreground mt-3 italic">"{notes}"</p>}
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  <ReportSection title="Capacity">
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="Rooms" value={String(inputs.numberOfRooms)} />
                      <StatCard label="Beds / Room" value={String(inputs.bedsPerRoom)} />
                      <StatCard label="Total Beds" value={String(metrics.totalBeds)} highlight />
                    </div>
                  </ReportSection>
                  <Separator />
                  <ReportSection title="Revenue">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label={`Price / bed / ${inputs.pricingType === "nightly" ? "night" : "week"}`} value={formatCurrency(inputs.pricePerUnit)} />
                      <StatCard label="Occupancy" value={formatPercent(inputs.occupancyRate)} />
                      <StatCard label="Weekly Revenue" value={formatCurrency(metrics.weeklyRevenue)} />
                      <StatCard label="Annual Revenue" value={formatCurrency(metrics.weeklyRevenue * 52)} highlight />
                    </div>
                  </ReportSection>
                  <Separator />
                  <ReportSection title="Annual Expenses">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(annualExpenses).map(([label, amount]) => (
                        <StatCard key={label} label={label} value={formatCurrency(amount)} />
                      ))}
                      <StatCard label="Total Expenses" value={formatCurrency(metrics.weeklyExpenses * 52)} highlight />
                    </div>
                  </ReportSection>
                  <Separator />
                  <ReportSection title="Results">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard label="Weekly Profit" value={formatCurrency(metrics.weeklyProfit)} positive={metrics.weeklyProfit >= 0} negative={metrics.weeklyProfit < 0} highlight />
                      <StatCard label="Monthly Profit" value={formatCurrency(metrics.monthlyProfit)} positive={metrics.monthlyProfit >= 0} negative={metrics.monthlyProfit < 0} highlight />
                      <StatCard label="Annual Profit" value={formatCurrency(metrics.weeklyProfit * 52)} positive={metrics.weeklyProfit >= 0} negative={metrics.weeklyProfit < 0} highlight />
                      <StatCard label="Profit Margin" value={formatPercent(metrics.profitMargin)} positive={metrics.profitMargin >= 20} negative={metrics.profitMargin < 0} highlight />
                    </div>
                    <div className="mt-3 rounded-lg border p-3 text-sm">
                      <span className="font-medium">Break-even: </span>
                      <span className={cn("font-semibold", metrics.breakEvenOccupancy <= inputs.occupancyRate ? "text-emerald-600" : "text-red-600")}>
                        {formatPercent(metrics.breakEvenOccupancy)} occupancy needed
                      </span>
                      <span className="text-muted-foreground ml-1">(target: {inputs.occupancyRate}%)</span>
                    </div>
                  </ReportSection>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Live Analysis */}
        <div className="w-72 shrink-0 border-l hidden lg:flex flex-col">
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-semibold">Live Analysis</h3>
              <p className="text-xs text-muted-foreground">Updates as you type</p>
            </div>

            {/* Viability card */}
            <div className={cn("rounded-lg border p-4", viability.bg, viability.border)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ViabilityIcon className={cn("w-4 h-4", viability.color)} />
                  <span className={cn("text-sm font-semibold", viability.color)}>{viability.label}</span>
                </div>
                <div className="text-right">
                  <p className={cn("text-xl font-bold", viability.color)}>
                    {formatCurrency(metrics.monthlyProfit)}
                  </p>
                  <p className={cn("text-xs", viability.color, "opacity-70")}>/ month</p>
                </div>
              </div>
              <p className={cn("text-xs mt-1", viability.color, "opacity-70")}>
                {formatPercent(metrics.profitMargin)} margin
              </p>
            </div>

            {/* Revenue section */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                Revenue
              </p>
              {[
                ["Annual", formatCurrency(metrics.weeklyRevenue * 52)],
                ["Monthly", formatCurrency(metrics.monthlyRevenue)],
                ["Weekly", formatCurrency(metrics.weeklyRevenue)],
                ["Occupancy", formatPercent(inputs.occupancyRate)],
                ["At 100% Occupancy", formatCurrency(calculateDeal({ ...inputs, occupancyRate: 100 }).weeklyRevenue * 52)],
                ["Total Beds", String(metrics.totalBeds)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Expenses section */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                Expenses (Annual)
              </p>
              {Object.entries(annualExpenses).map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1 text-sm font-semibold border-t mt-1 pt-2">
                <span>Total</span>
                <span>{formatCurrency(metrics.weeklyExpenses * 52)}</span>
              </div>
            </div>

            <Separator />

            {/* Break-even */}
            <div className="text-sm">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Break-even
              </p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min occupancy</span>
                <span className={cn("font-semibold", metrics.breakEvenOccupancy <= inputs.occupancyRate ? "text-emerald-600" : "text-red-600")}>
                  {formatPercent(metrics.breakEvenOccupancy)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}

function StatCard({ label, value, highlight, positive, negative }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border p-3 space-y-0.5", highlight ? "bg-card" : "bg-muted/30")}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className={cn(
        "text-base font-bold leading-tight",
        positive && "text-emerald-600 dark:text-emerald-400",
        negative && "text-red-600 dark:text-red-400"
      )}>
        {value}
      </p>
    </div>
  );
}
