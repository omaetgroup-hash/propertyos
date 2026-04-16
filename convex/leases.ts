import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  assertBelongsToProperty,
  getCurrentUserOrNull,
  requireCurrentUser,
  requireOwnedLease,
  requireOwnedProperty,
  requireOwnedTenant,
  requireOwnedUnit,
} from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const allLeases = await Promise.all(
      properties.map((p) =>
        ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", p._id))
          .collect()
      )
    );

    const enriched = await Promise.all(
      allLeases.flat().map(async (lease) => {
        const [property, unit, tenant] = await Promise.all([
          ctx.db.get(lease.propertyId),
          ctx.db.get(lease.unitId),
          ctx.db.get(lease.tenantId),
        ]);
        return {
          ...lease,
          propertyName: property?.name ?? "Unknown property",
          propertyCountry: property?.country ?? "nz",
          unitNumber: unit?.unitNumber ?? "?",
          tenantName: tenant?.name ?? "Unknown tenant",
          tenantEmail: tenant?.email ?? "",
        };
      })
    );

    // Sort by startDate descending
    return enriched.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

export const get = query({
  args: { id: v.id("leases") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const lease = await ctx.db.get(args.id);
    if (!lease) return null;
    const property = await ctx.db.get(lease.propertyId);
    if (!property || property.ownerId !== user._id) return null;
    return lease;
  },
});

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.ownerId !== user._id) return [];

    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    return await Promise.all(
      leases.map(async (lease) => {
        const [unit, tenant] = await Promise.all([
          ctx.db.get(lease.unitId),
          ctx.db.get(lease.tenantId),
        ]);
        return {
          ...lease,
          unitNumber: unit?.unitNumber ?? "?",
          tenantName: tenant?.name ?? "Unknown tenant",
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    tenantId: v.id("tenants"),
    startDate: v.string(),
    endDate: v.string(),
    weeklyRent: v.number(),
    bondAmount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("terminated"),
      v.literal("periodic"),
      v.literal("pending")
    ),
    rtaLodged: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedProperty(ctx, args.propertyId, user._id);
    const unit = await requireOwnedUnit(ctx, args.unitId, user._id);
    await requireOwnedTenant(ctx, args.tenantId, user._id);
    assertBelongsToProperty("Unit", unit.propertyId, args.propertyId);
    // Mark unit as occupied when lease is active
    if (args.status === "active" || args.status === "periodic") {
      await ctx.db.patch(args.unitId, { status: "occupied" });
    }
    return await ctx.db.insert("leases", args);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("leases"),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("terminated"),
      v.literal("periodic"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const lease = await requireOwnedLease(ctx, args.id, user._id);
    await ctx.db.patch(args.id, { status: args.status });
    // Update unit status accordingly
    if (args.status === "active" || args.status === "periodic") {
      await ctx.db.patch(lease.unitId, { status: "occupied" });
    } else if (args.status === "terminated" || args.status === "expired") {
      await ctx.db.patch(lease.unitId, { status: "vacant" });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("leases"),
    weeklyRent: v.optional(v.number()),
    bondAmount: v.optional(v.number()),
    endDate: v.optional(v.string()),
    rtaLodged: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { id, ...fields } = args;
    await requireOwnedLease(ctx, id, user._id);
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("leases") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireOwnedLease(ctx, args.id, user._id);
    await ctx.db.delete(args.id);
  },
});
