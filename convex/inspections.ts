import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  assertBelongsToProperty,
  getCurrentUserOrNull,
  requireCurrentUser,
  requireOwnedInspection,
  requireOwnedProperty,
  requireOwnedUnit,
} from "./authz";

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const items = await ctx.db
      .query("inspections")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      items.map(async (insp) => {
        const property = await ctx.db.get(insp.propertyId);
        const unit = insp.unitId ? await ctx.db.get(insp.unitId) : null;
        return {
          ...insp,
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

    const items = await ctx.db
      .query("inspections")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const nowIso = new Date().toISOString().split("T")[0] as string;

    return {
      total: items.length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      completed: items.filter((i) => i.status === "completed").length,
      cancelled: items.filter((i) => i.status === "cancelled").length,
      // Overdue = scheduled but date has already passed
      overdue: items.filter(
        (i) => i.status === "scheduled" && i.scheduledDate < nowIso
      ).length,
      upcoming7: items.filter((i) => {
        const in7 = new Date();
        in7.setDate(in7.getDate() + 7);
        return (
          i.status === "scheduled" &&
          i.scheduledDate >= nowIso &&
          i.scheduledDate <= in7.toISOString().split("T")[0]
        );
      }).length,
    };
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")),
    type: v.union(
      v.literal("move_in"),
      v.literal("move_out"),
      v.literal("routine"),
      v.literal("healthy_homes"),
      v.literal("maintenance"),
      v.literal("compliance"),
      v.literal("pre_tenancy")
    ),
    scheduledDate: v.string(),
    inspectorName: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedProperty(ctx, args.propertyId, user._id);
    if (args.unitId) {
      const unit = await requireOwnedUnit(ctx, args.unitId, user._id);
      assertBelongsToProperty("Unit", unit.propertyId, args.propertyId);
    }
    return await ctx.db.insert("inspections", { ...args, ownerId: user._id });
  },
});

export const complete = mutation({
  args: {
    id: v.id("inspections"),
    completedDate: v.string(),
    overallCondition: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { id, ...fields } = args;
    await requireOwnedInspection(ctx, id, user._id);
    await ctx.db.patch(id, { ...fields, status: "completed" });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("inspections"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedInspection(ctx, args.id, user._id);
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("inspections") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedInspection(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});
