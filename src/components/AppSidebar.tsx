import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  DollarSign,
  Zap,
  ClipboardCheck,
  ShieldCheck,
  MapPin,
  ChevronRight,
  LogOut,
  BarChart3,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";

const mainNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Tenants", href: "/tenants", icon: Users },
  { label: "Leases", href: "/leases", icon: FileText },
];

const operationsNavItems = [
  { label: "Financials", href: "/financials", icon: DollarSign },
  { label: "Accounting", href: "/accounting", icon: BookOpen },
  { label: "Utilities", href: "/utilities", icon: Zap },
  { label: "Inspections", href: "/inspections", icon: ClipboardCheck },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck },
  { label: "Map View", href: "/map", icon: MapPin },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const dealNavItems = [
  { label: "Opportunities", href: "/opportunities", icon: TrendingUp },
];

export default function AppSidebar() {
  const location = useLocation();
  const { removeUser } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser, {});

  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
          <Building2 className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-sidebar-foreground">PropertyOS</span>
          <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 pb-2">
          Main Menu
        </p>
        {mainNavItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
          return (
            <NavLink
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </NavLink>
          );
        })}

        <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 pb-2 pt-4">
          Financial & Compliance
        </p>
        {operationsNavItems.map(({ label, href, icon: Icon }) => {
          const isActive = location.pathname.startsWith(href);
          return (
            <NavLink
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </NavLink>
          );
        })}

        <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-3 pb-2 pt-4">
          Deal Analysis
        </p>
        {dealNavItems.map(({ label, href, icon: Icon }) => {
          const isActive = location.pathname.startsWith(href);
          return (
            <NavLink
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {currentUser?.name ?? "User"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {currentUser?.email ?? ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            onClick={removeUser}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
