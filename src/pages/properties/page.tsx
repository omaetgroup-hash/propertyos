"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Building2, Plus, Search } from "lucide-react";
import PropertyCard from "./_components/PropertyCard.tsx";
import AddPropertyDialog from "./_components/AddPropertyDialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "residential" | "commercial">("all");
  const [countryFilter, setCountryFilter] = useState<"all" | "nz" | "au">("all");
  const [addOpen, setAddOpen] = useState(false);

  const [debouncedSearch] = useDebounce(search, 300);
  const properties = useQuery(api.properties.list, {});

  const filtered = (properties ?? []).filter((p) => {
    const matchesSearch =
      !debouncedSearch ||
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.address.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.city.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    const matchesCountry = countryFilter === "all" || p.country === countryFilter;
    return matchesSearch && matchesType && matchesCountry;
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {properties ? `${properties.length} ${properties.length === 1 ? "property" : "properties"} in your portfolio` : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Property
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, address or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v as typeof countryFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🌏 All countries</SelectItem>
            <SelectItem value="nz">🇳🇿 New Zealand</SelectItem>
            <SelectItem value="au">🇦🇺 Australia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {properties === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>
              {properties.length === 0 ? "No properties yet" : "No properties match your filters"}
            </EmptyTitle>
            <EmptyDescription>
              {properties.length === 0
                ? "Add your first NZ or AU property to get started"
                : "Try adjusting your search or filters"}
            </EmptyDescription>
          </EmptyHeader>
          {properties.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Property
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PropertyCard key={p._id} property={p} />
          ))}
        </div>
      )}

      <AddPropertyDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
