import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  assertBelongsToProperty,
  getCurrentUserOrNull,
  requireCurrentUser,
  requireOwnedProperty,
  requireOwnedUnit,
  requireOwnedUtility,
} from "./authz";

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const utilities = await ctx.db
      .query("utilities")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      utilities.map(async (u) => {
        const property = await ctx.db.get(u.propertyId);
        const unit = u.unitId ? await ctx.db.get(u.unitId) : null;
        return {
          ...u,
          propertyName: property?.name ?? "Unknown property",
          propertyCountry: property?.country ?? "nz",
          unitNumber: unit?.unitNumber ?? null,
        };
      })
    );
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const utilities = await ctx.db
      .query("utilities")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const totalMonthly = utilities
      .filter((u) => u.status !== "paid")
      .reduce((s, u) => s + u.amount, 0);

    const overdue = utilities.filter((u) => u.status === "overdue").length;
    const pending = utilities.filter((u) => u.status === "pending").length;
    const paid = utilities.filter((u) => u.status === "paid").length;

    // Amount by type (all records)
    const byType: Record<string, number> = {};
    for (const u of utilities) {
      byType[u.type] = (byType[u.type] ?? 0) + u.amount;
    }

    // Outstanding total (overdue + pending)
    const outstanding = utilities
      .filter((u) => u.status === "overdue" || u.status === "pending")
      .reduce((s, u) => s + u.amount, 0);

    return { totalMonthly, overdue, pending, paid, outstanding, byType, total: utilities.length };
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")),
    type: v.union(
      v.literal("electricity"),
      v.literal("gas"),
      v.literal("water"),
      v.literal("broadband"),
      v.literal("rates"),
      v.literal("body_corporate"),
      v.literal("rubbish"),
      v.literal("other")
    ),
    provider: v.string(),
    accountNumber: v.optional(v.string()),
    amount: v.number(),
    billingDate: v.string(),
    dueDate: v.string(),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("overdue")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedProperty(ctx, args.propertyId, user._id);
    if (args.unitId) {
      const unit = await requireOwnedUnit(ctx, args.unitId, user._id);
      assertBelongsToProperty("Unit", unit.propertyId, args.propertyId);
    }
    return await ctx.db.insert("utilities", { ...args, ownerId: user._id });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("utilities"),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("overdue")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedUtility(ctx, args.id, user._id);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("utilities") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedUtility(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});
