import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      expenses.map(async (expense) => {
        const property = await ctx.db.get(expense.propertyId);
        return {
          ...expense,
          propertyName: property?.name ?? "Unknown property",
          propertyCountry: property?.country ?? "nz",
        };
      })
    );
  },
});

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenses")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .collect();
  },
});

export const getFinancialStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Total expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // By category
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }

    // Last 6 months monthly breakdown
    const now = new Date();
    const months: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      const amount = expenses
        .filter((e) => e.date.startsWith(key))
        .reduce((sum, e) => sum + e.amount, 0);
      months.push({ month: label, amount });
    }

    // Active lease income
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    let weeklyIncome = 0;
    for (const prop of properties) {
      const leases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", prop._id))
        .collect();
      const activeLeases = leases.filter(
        (l) => l.status === "active" || l.status === "periodic"
      );
      weeklyIncome += activeLeases.reduce((sum, l) => sum + l.weeklyRent, 0);
    }

    const monthlyIncome = Math.round(weeklyIncome * (52 / 12));
    // Annualise
    const annualIncome = weeklyIncome * 52;
    const annualExpenses = totalExpenses;

    return {
      totalExpenses,
      byCategory,
      monthlyTrend: months,
      weeklyIncome,
      monthlyIncome,
      annualIncome,
      annualExpenses,
      netAnnual: annualIncome - annualExpenses,
    };
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")),
    category: v.union(
      v.literal("maintenance"),
      v.literal("rates"),
      v.literal("insurance"),
      v.literal("body_corporate"),
      v.literal("property_management"),
      v.literal("landscaping"),
      v.literal("utilities"),
      v.literal("legal"),
      v.literal("advertising"),
      v.literal("depreciation"),
      v.literal("other")
    ),
    amount: v.number(),
    date: v.string(),
    description: v.string(),
    vendor: v.optional(v.string()),
    gstInclusive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    return await ctx.db.insert("expenses", { ...args, ownerId: user._id });
  },
});

export const remove = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
