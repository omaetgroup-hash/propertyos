import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import { MoreHorizontal, Pencil, Trash2, Building2, MapPin } from "lucide-react";
import { calculateDeal, formatCurrency, formatPercent } from "@/lib/deal-calculator.ts";
import { cn } from "@/lib/utils.ts";

type Opportunity = Doc<"opportunities">;

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit: (opp: Opportunity) => void;
}

const statusColors: Record<string, string> = {
  evaluating: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  converted: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
};

const viabilityDot: Record<string, string> = {
  profitable: "bg-emerald-500",
  borderline: "bg-amber-500",
  not_viable: "bg-red-500",
};

export default function OpportunityCard({ opportunity, onEdit }: OpportunityCardProps) {
  const removeOpportunity = useMutation(api.opportunities.remove);

  const metrics = calculateDeal({
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

  const handleDelete = async () => {
    try {
      await removeOpportunity({ id: opportunity._id as Id<"opportunities"> });
      toast.success("Opportunity deleted.");
    } catch {
      toast.error("Failed to delete opportunity.");
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onEdit(opportunity)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full shrink-0",
                  viabilityDot[metrics.viability]
                )}
              />
              <span className="font-semibold text-sm truncate">{opportunity.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{opportunity.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              className={cn(
                "text-[10px] font-semibold capitalize border-0",
                statusColors[opportunity.status]
              )}
            >
              {opportunity.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(opportunity); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => { e.stopPropagation(); void handleDelete(); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Capacity */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            {opportunity.numberOfRooms} rooms × {opportunity.bedsPerRoom} beds = {metrics.totalBeds} beds
          </span>
        </div>

        {/* Key financials */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center rounded-md bg-muted/30 py-2 px-1">
            <p className="text-[10px] text-muted-foreground">Weekly Rev</p>
            <p className="text-xs font-bold">{formatCurrency(metrics.weeklyRevenue)}</p>
          </div>
          <div className="text-center rounded-md bg-muted/30 py-2 px-1">
            <p className="text-[10px] text-muted-foreground">Net Profit</p>
            <p className={cn("text-xs font-bold", metrics.weeklyProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(metrics.weeklyProfit)}
            </p>
          </div>
          <div className="text-center rounded-md bg-muted/30 py-2 px-1">
            <p className="text-[10px] text-muted-foreground">Margin</p>
            <p className={cn("text-xs font-bold", metrics.profitMargin >= 20 ? "text-emerald-600" : metrics.profitMargin > 0 ? "text-amber-600" : "text-red-600")}>
              {formatPercent(metrics.profitMargin)}
            </p>
          </div>
        </div>

        {/* Break-even */}
        <div className="text-xs text-muted-foreground">
          Break-even: {formatPercent(metrics.breakEvenOccupancy)} occupancy
          {" "}
          <span className="text-foreground font-medium">
            (target: {opportunity.occupancyRate}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
