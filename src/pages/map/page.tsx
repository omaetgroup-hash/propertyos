import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Building2, Home, MapPin, Search, Navigation } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { AU_STATES, NZ_REGIONS } from "@/lib/locale.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";

// Default center between NZ and AU
const DEFAULT_CENTER: [number, number] = [-33.5, 151.0];
const DEFAULT_ZOOM = 4;

type PropertyItem = {
  _id: string;
  name: string;
  type: "residential" | "commercial";
  country: "nz" | "au";
  address: string;
  suburb?: string;
  city: string;
  region: string;
  postCode: string;
  status: "active" | "inactive";
  totalUnits: number;
  lat?: number;
  lng?: number;
  imageUrl?: string | null;
};

// Custom property marker icon
function createMarkerIcon(
  type: "residential" | "commercial",
  isSelected: boolean
) {
  const color = type === "residential" ? "#8b5cf6" : "#3b82f6";
  const size = isSelected ? 20 : 14;
  const ring = isSelected
    ? `box-shadow:0 0 0 4px ${color}33,0 2px 8px rgba(0,0,0,0.35)`
    : "box-shadow:0 2px 6px rgba(0,0,0,0.35)";
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:${color};border:2.5px solid white;${ring}"></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// Component to fly the map to a location
function MapFlyTo({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

function getRegionLabel(country: "nz" | "au", regionCode: string): string {
  const list = country === "au" ? AU_STATES : NZ_REGIONS;
  return (
    (list as ReadonlyArray<{ value: string; label: string }>).find(
      (r) => r.value === regionCode
    )?.label ?? regionCode
  );
}

export default function MapPage() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<"all" | "nz" | "au">(
    "all"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const [debouncedSearch] = useDebounce(search, 300);
  const properties = useQuery(api.properties.list, {});

  const filtered = (properties ?? []).filter((p) => {
    const matchesSearch =
      !debouncedSearch ||
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.address.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.city.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesCountry = countryFilter === "all" || p.country === countryFilter;
    return matchesSearch && matchesCountry;
  }) as PropertyItem[];

  const mapped = filtered.filter((p) => p.lat !== undefined && p.lng !== undefined);
  const unmapped = filtered.filter((p) => p.lat === undefined || p.lng === undefined);

  function handleSelectProperty(p: PropertyItem) {
    setSelectedId(p._id);
    if (p.lat !== undefined && p.lng !== undefined) {
      setFlyTarget([p.lat, p.lng]);
    }
  }

  const totalMapped = (properties ?? []).filter(
    (p) => p.lat !== undefined && p.lng !== undefined
  ).length;

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b bg-background flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Map View</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {properties === undefined
              ? "Loading..."
              : `${totalMapped} of ${properties.length} properties mapped`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-700 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-1.5"></span>
            Residential
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
            Commercial
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-80 shrink-0 border-r flex flex-col bg-background">
          {/* Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search properties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={countryFilter}
              onValueChange={(v) => setCountryFilter(v as typeof countryFilter)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌏 All countries</SelectItem>
                <SelectItem value="nz">🇳🇿 New Zealand</SelectItem>
                <SelectItem value="au">🇦🇺 Australia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property list */}
          <div className="flex-1 overflow-y-auto">
            {properties === undefined ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {/* Mapped properties */}
                {mapped.length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        On Map ({mapped.length})
                      </p>
                    </div>
                    <div className="px-2 pb-2 space-y-1">
                      {mapped.map((p) => (
                        <PropertyListItem
                          key={p._id}
                          property={p}
                          isSelected={selectedId === p._id}
                          onSelect={handleSelectProperty}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmapped properties */}
                {unmapped.length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        No Location Set ({unmapped.length})
                      </p>
                    </div>
                    <div className="px-2 pb-2 space-y-1">
                      {unmapped.map((p) => (
                        <PropertyListItem
                          key={p._id}
                          property={p}
                          isSelected={selectedId === p._id}
                          onSelect={handleSelectProperty}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filtered.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No properties match your filters
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-w-0 relative">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width: "100%", height: "100%" }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapFlyTo center={flyTarget} zoom={14} />
            {mapped.map((p) => (
              <Marker
                key={p._id}
                position={[p.lat!, p.lng!]}
                icon={createMarkerIcon(p.type, selectedId === p._id)}
                eventHandlers={{
                  click: () => setSelectedId(p._id),
                }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      {p.type === "residential" ? (
                        <Home className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="font-semibold text-sm leading-tight">
                        {p.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      {[p.address, p.suburb, p.city].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      {p.totalUnits} {p.totalUnits === 1 ? "unit" : "units"} ·{" "}
                      {getRegionLabel(p.country, p.region)}
                    </p>
                    <a
                      href={`/properties/${p._id}`}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      View property →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Empty map state overlay */}
          {properties !== undefined && mapped.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-background/90 backdrop-blur-sm border rounded-xl p-6 text-center space-y-2 max-w-xs mx-4 pointer-events-auto shadow-lg">
                <Navigation className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="font-semibold text-sm">No properties on the map yet</p>
                <p className="text-xs text-muted-foreground">
                  Open a property and set its location to pin it here
                </p>
                <Link
                  to="/properties"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Go to Properties →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyListItem({
  property,
  isSelected,
  onSelect,
}: {
  property: PropertyItem;
  isSelected: boolean;
  onSelect: (p: PropertyItem) => void;
}) {
  const hasCords = property.lat !== undefined && property.lng !== undefined;
  const addressLine = [property.address, property.suburb, property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      onClick={() => onSelect(property)}
      className={cn(
        "w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-accent group",
        isSelected && "bg-accent border border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {property.type === "residential" ? (
              <Home className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{property.name}</span>
            <span className="text-xs shrink-0">
              {property.country === "nz" ? "🇳🇿" : "🇦🇺"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{addressLine}</p>
        </div>
        <div className="shrink-0">
          {hasCords ? (
            <Badge
              variant="secondary"
              className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 gap-1"
            >
              <MapPin className="w-2.5 h-2.5" />
              Pinned
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-[10px] py-0 px-1.5 gap-1 text-muted-foreground"
            >
              No pin
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
