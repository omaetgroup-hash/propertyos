import { query } from "./_generated/server";

export const getReportData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const now = new Date();
    const nowIso = now.toISOString().split("T")[0] as string;

    // Date helpers
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in60 = new Date(now);
    in60.setDate(in60.getDate() + 60);
    const in30Iso = in30.toISOString().split("T")[0] as string;
    const in60Iso = in60.toISOString().split("T")[0] as string;

    // ── Fetch all core data ────────────────────────────────────────────────────
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const allUnitsNested = await Promise.all(
      properties.map((p) =>
        ctx.db
          .query("units")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect()
      )
    );
    const units = allUnitsNested.flat();

    const allLeasesNested = await Promise.all(
      properties.map((p) =>
        ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect()
      )
    );
    const leases = allLeasesNested.flat();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const allInspectionsNested = await Promise.all(
      properties.map((p) =>
        ctx.db
          .query("inspections")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect()
      )
    );
    const inspections = allInspectionsNested.flat();

    const allComplianceNested = await Promise.all(
      properties.map((p) =>
        ctx.db
          .query("compliance")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect()
      )
    );
    const complianceItems = allComplianceNested.flat();

    // ── Financial summary ──────────────────────────────────────────────────────
    const activeLeases = leases.filter(
      (l) => l.status === "active" || l.status === "periodic"
    );
    const weeklyRentRoll = activeLeases.reduce((sum, l) => sum + l.weeklyRent, 0);
    const monthlyRentRoll = Math.round(weeklyRentRoll * (52 / 12));
    const annualIncome = weeklyRentRoll * 52;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = annualIncome - totalExpenses;

    // Expense breakdown by category for report
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amount;
    }

    // ── Occupancy ──────────────────────────────────────────────────────────────
    const occupiedUnits = units.filter((u) => u.status === "occupied").length;
    const vacantUnits = units.filter((u) => u.status === "vacant").length;
    const maintenanceUnits = units.filter((u) => u.status === "maintenance").length;
    const totalUnits = units.length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    // ── Tenant & lease summary ─────────────────────────────────────────────────
    const activeTenants = tenants.filter((t) => t.status === "active").length;
    const activeLeaseCount = activeLeases.length;
    const periodicLeases = leases.filter((l) => l.status === "periodic").length;
    // Leases expiring in the next 30 days
    const expiringIn30 = activeLeases.filter(
      (l) => l.endDate >= nowIso && l.endDate <= in30Iso
    ).length;
    // Leases expiring between 31–60 days
    const expiringIn60 = activeLeases.filter(
      (l) => l.endDate > in30Iso && l.endDate <= in60Iso
    ).length;

    // ── Maintenance (maintenance-type inspections as proxy) ────────────────────
    const maintenanceInspections = inspections.filter((i) => i.type === "maintenance");
    const openMaintenance = maintenanceInspections.filter(
      (i) => i.status === "scheduled" || i.status === "in_progress"
    ).length;
    const inProgressMaintenance = maintenanceInspections.filter(
      (i) => i.status === "in_progress"
    ).length;
    const completedMaintenance = maintenanceInspections.filter(
      (i) => i.status === "completed"
    ).length;
    // "High priority" = poor condition + not completed
    const highPriorityMaintenance = maintenanceInspections.filter(
      (i) => i.status !== "completed" && i.overallCondition === "poor"
    ).length;

    // ── Compliance ─────────────────────────────────────────────────────────────
    const upcomingCompliance30 = complianceItems.filter(
      (c) => c.status !== "compliant" && c.dueDate >= nowIso && c.dueDate <= in30Iso
    ).length;
    const upcomingCompliance60 = complianceItems.filter(
      (c) => c.status !== "compliant" && c.dueDate > in30Iso && c.dueDate <= in60Iso
    ).length;
    const overdueCompliance = complianceItems.filter(
      (c) => c.status === "overdue" || c.status === "expired"
    ).length;
    const compliantItems = complianceItems.filter((c) => c.status === "compliant").length;

    // ── Inspection summary ─────────────────────────────────────────────────────
    const scheduledInspections = inspections.filter((i) => i.status === "scheduled").length;
    const completedInspections = inspections.filter((i) => i.status === "completed").length;
    // Overdue = scheduled but date has passed
    const overdueInspections = inspections.filter(
      (i) => i.status === "scheduled" && i.scheduledDate < nowIso
    ).length;

    return {
      generatedAt: now.toISOString(),
      financial: {
        annualIncome,
        weeklyRentRoll,
        monthlyRentRoll,
        totalExpenses,
        netProfit,
        expenseByCategory,
      },
      occupancy: {
        totalProperties: properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate,
      },
      tenants: {
        totalTenants: tenants.length,
        activeTenants,
        activeLeaseCount,
        periodicLeases,
        expiringIn30,
        expiringIn60,
      },
      maintenance: {
        total: maintenanceInspections.length,
        open: openMaintenance,
        inProgress: inProgressMaintenance,
        completed: completedMaintenance,
        highPriority: highPriorityMaintenance,
      },
      compliance: {
        total: complianceItems.length,
        compliant: compliantItems,
        upcomingIn30Days: upcomingCompliance30,
        upcomingIn60Days: upcomingCompliance60,
        overdue: overdueCompliance,
      },
      inspections: {
        total: inspections.length,
        scheduled: scheduledInspections,
        completed: completedInspections,
        overdue: overdueInspections,
      },
    };
  },
});
