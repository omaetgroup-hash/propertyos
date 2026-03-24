import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge.tsx";
import { Building2, Home, MapPin, Layers } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { AU_STATES, NZ_REGIONS } from "@/lib/locale.ts";

type Props = {
  property: Doc<"properties">;
};

function getRegionLabel(country: "nz" | "au", regionCode: string): string {
  const list = country === "au" ? AU_STATES : NZ_REGIONS;
  return (list as ReadonlyArray<{ value: string; label: string }>).find(
    (r) => r.value === regionCode
  )?.label ?? regionCode;
}

export default function PropertyCard({ property }: Props) {
  const typeIcon = property.type === "residential"
    ? <Home className="w-4 h-4" />
    : <Building2 className="w-4 h-4" />;

  const countryFlag = property.country === "nz" ? "🇳🇿" : "🇦🇺";
  const regionLabel = getRegionLabel(property.country, property.region);
  const addressLine = [property.address, property.suburb, property.city].filter(Boolean).join(", ");

  return (
    <Link to={`/properties/${property._id}`} className="block group">
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
        {/* Coloured header band */}
        <div
          className={cn(
            "h-2",
            property.status === "active"
              ? property.type === "residential"
                ? "bg-violet-500"
                : "bg-blue-500"
              : "bg-muted"
          )}
        />

        <div className="p-5 space-y-4">
          {/* Type + country badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1.5 capitalize text-xs",
                  property.type === "residential"
                    ? "bg-violet-500/10 text-violet-700"
                    : "bg-blue-500/10 text-blue-700"
                )}
              >
                {typeIcon}
                {property.type}
              </Badge>
              <span className="text-base">{countryFlag}</span>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                property.status === "active"
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {property.status}
            </Badge>
          </div>

          {/* Name */}
          <div>
            <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
              {property.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-1">{addressLine}</span>
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 pt-1 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5" />
              <span>
                <span className="font-semibold text-foreground">{property.totalUnits}</span>{" "}
                {property.totalUnits === 1 ? "unit" : "units"}
              </span>
            </div>
            {property.squareMetres && (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{property.squareMetres}</span> m²
              </div>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {regionLabel}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
