import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Users, Plus, Search, Mail, Phone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import AddTenantDialog from "./_components/AddTenantDialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

function statusConfig(status: Doc<"tenants">["status"]) {
  return {
    active: { label: "Active", className: "bg-emerald-500/10 text-emerald-700" },
    inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
    prospect: { label: "Prospect", className: "bg-blue-500/10 text-blue-700" },
  }[status];
}

function TenantCard({ tenant }: { tenant: Doc<"tenants"> }) {
  const initials = tenant.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { label, className } = statusConfig(tenant.status);

  return (
    <Card className="hover:shadow-sm hover:border-primary/20 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm truncate">{tenant.name}</p>
              <Badge variant="secondary" className={cn("text-xs shrink-0", className)}>
                {label}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {tenant.email}
              </p>
              {tenant.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {tenant.phone}
                </p>
              )}
            </div>
            {tenant.emergencyContactName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Emergency: {tenant.emergencyContactName}
                {tenant.emergencyContactPhone && ` · ${tenant.emergencyContactPhone}`}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "prospect">("all");
  const [addOpen, setAddOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const tenants = useQuery(api.tenants.list, {});

  const filtered = (tenants ?? []).filter((t) => {
    const matchesSearch =
      !debouncedSearch ||
      t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (t.phone ?? "").includes(debouncedSearch);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCounts = {
    active: (tenants ?? []).filter((t) => t.status === "active").length,
    inactive: (tenants ?? []).filter((t) => t.status === "inactive").length,
    prospect: (tenants ?? []).filter((t) => t.status === "prospect").length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tenants
              ? `${tenants.length} ${tenants.length === 1 ? "tenant" : "tenants"} · ${activeCounts.active} active · ${activeCounts.prospect} prospects`
              : "Loading..."}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {tenants === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>
              {tenants.length === 0 ? "No tenants yet" : "No tenants match your filters"}
            </EmptyTitle>
            <EmptyDescription>
              {tenants.length === 0
                ? "Add your first tenant or prospect to get started"
                : "Try adjusting your search or filters"}
            </EmptyDescription>
          </EmptyHeader>
          {tenants.length === 0 && (
            <EmptyContent>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Tenant
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TenantCard key={t._id} tenant={t} />
          ))}
        </div>
      )}

      <AddTenantDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
